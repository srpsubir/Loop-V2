#!/usr/bin/env node
// MAV-266 diagnostic: run Loop's Louvain contact-cluster algorithm against
// real data (messages.db + groups-cache.json) outside Electron.
//
// Group membership isn't stored in messages.db (only per-message sender_jid),
// and groups-cache.json is sparse (only 2 groups cached from live sidecar
// fetches so far). So group participant sets are derived as a proxy: the
// distinct set of sender_jid values who've sent a message in that @g.us chat.
// createdAt/lastMessageAt are likewise derived from MIN/MAX(timestamp) per
// chat rather than the live sidecar's real group metadata.
//
// The louvain() and merge-pass (_mergeScore/_mergePair/_mergeClusters)
// functions below are copied verbatim from src/main/whatsapp.ts (not
// imported — that module is an Electron-only singleton wired to app.getPath,
// a live sidecar process, and other app state that can't run standalone).

import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const LOOP_DATA = join(homedir(), 'Library/Application Support/loop/LoopData')
const db = new Database(join(LOOP_DATA, 'messages.db'), { readonly: true })

let groupNames = new Map()
try {
  const cache = JSON.parse(readFileSync(join(LOOP_DATA, 'groups-cache.json'), 'utf-8'))
  for (const g of cache.groups ?? []) groupNames.set(g.id, g.name)
} catch { /* sparse/missing cache is fine, fall back to JIDs */ }

// ─── Derive group metadata from messages.db ────────────────────────────────
const groupChatIds = db.prepare(
  `SELECT DISTINCT chat_id FROM messages WHERE chat_id LIKE '%@g.us'`
).all().map(r => r.chat_id)

const groups = []
for (const chatId of groupChatIds) {
  const members = db.prepare(
    `SELECT DISTINCT sender_jid FROM messages WHERE chat_id = ? AND sender_jid != 'me'`
  ).all(chatId).map(r => r.sender_jid)
  if (members.length < 2) continue
  const { minTs, maxTs, msgCount } = db.prepare(
    `SELECT MIN(timestamp) minTs, MAX(timestamp) maxTs, COUNT(*) msgCount FROM messages WHERE chat_id = ?`
  ).get(chatId)
  groups.push({
    id: chatId,
    name: groupNames.get(chatId) ?? chatId,
    members,
    createdAt: minTs,
    lastMessageAt: maxTs,
    msgCount,
  })
}

// ─── DM message counts (tie-strength proxy, dmBoost input) ────────────────
const dmCounts = new Map()
for (const row of db.prepare(
  `SELECT chat_id, COUNT(*) c FROM messages WHERE chat_id NOT LIKE '%@g.us' GROUP BY chat_id`
).all()) {
  dmCounts.set(row.chat_id, row.c)
}

console.log(`Loaded ${groups.length} groups (>=2 derived participants), ${dmCounts.size} DM chats.\n`)

// ─── Contact -> groups index ────────────────────────────────────────────
const contactGroups = new Map()
for (const g of groups) {
  for (const jid of g.members) {
    if (!contactGroups.has(jid)) contactGroups.set(jid, [])
    contactGroups.get(jid).push(g.id)
  }
}

// ─── Bipartite projection -> weighted contact graph (verbatim from whatsapp.ts) ─
const weightedGraph = new Map()
for (const g of groups) {
  const members = g.members
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const a = members[i], b = members[j]
      const ga = new Set(contactGroups.get(a) ?? [])
      const gb = new Set(contactGroups.get(b) ?? [])
      const intersection = [...ga].filter(gid => gb.has(gid)).length
      const union = new Set([...ga, ...gb]).size
      const jaccard = union > 0 ? intersection / union : 0
      if (jaccard < 0.2) continue
      const dmBoost = Math.max(dmCounts.get(a) ?? 0, dmCounts.get(b) ?? 0)
      const weight = jaccard * (1 + Math.log(1 + dmBoost))
      if (!weightedGraph.has(a)) weightedGraph.set(a, new Map())
      if (!weightedGraph.has(b)) weightedGraph.set(b, new Map())
      const prev = weightedGraph.get(a).get(b) ?? 0
      if (weight > prev) {
        weightedGraph.get(a).set(b, weight)
        weightedGraph.get(b).set(a, weight)
      }
    }
  }
}

// ─── Louvain (verbatim from whatsapp.ts) ───────────────────────────────────
function louvain(graph) {
  const nodes = [...graph.keys()]
  if (nodes.length === 0) return new Map()
  const community = new Map(nodes.map(n => [n, n]))
  let m = 0
  for (const neighbors of graph.values()) for (const w of neighbors.values()) m += w
  m /= 2
  if (m === 0) return community
  const ki = new Map()
  for (const [node, neighbors] of graph) {
    let s = 0; for (const w of neighbors.values()) s += w
    ki.set(node, s)
  }
  const sigTot = new Map()
  for (const [node, comm] of community) sigTot.set(comm, (sigTot.get(comm) ?? 0) + (ki.get(node) ?? 0))
  let improved = true
  while (improved) {
    improved = false
    for (const node of nodes) {
      const currComm = community.get(node)
      const ki_node = ki.get(node) ?? 0
      let ki_in_curr = 0
      for (const [nb, w] of graph.get(node) ?? []) if (community.get(nb) === currComm) ki_in_curr += w
      sigTot.set(currComm, (sigTot.get(currComm) ?? 0) - ki_node)
      community.set(node, '\x00')
      const candIn = new Map()
      for (const [nb, w] of graph.get(node) ?? []) {
        const nc = community.get(nb)
        if (nc !== '\x00') candIn.set(nc, (candIn.get(nc) ?? 0) + w)
      }
      candIn.set(currComm, ki_in_curr)
      let bestComm = currComm
      let bestScore = ki_in_curr / m - (sigTot.get(currComm) ?? 0) * ki_node / (2 * m * m)
      for (const [comm, ki_in] of candIn) {
        if (comm === currComm) continue
        const score = ki_in / m - (sigTot.get(comm) ?? 0) * ki_node / (2 * m * m)
        if (score > bestScore) { bestScore = score; bestComm = comm }
      }
      community.set(node, bestComm)
      sigTot.set(bestComm, (sigTot.get(bestComm) ?? 0) + ki_node)
      if (bestComm !== currComm) improved = true
    }
  }
  return community
}

const communityOf = louvain(weightedGraph)
const communityMembers = new Map()
for (const [node, comm] of communityOf) {
  if (!communityMembers.has(comm)) communityMembers.set(comm, [])
  communityMembers.get(comm).push(node)
}
const rawClusters = [...communityMembers.values()].filter(c => c.length >= 2)

const adjacency = new Map()
for (const [a, neighbors] of weightedGraph) {
  if (!adjacency.has(a)) adjacency.set(a, new Set())
  for (const [b] of neighbors) adjacency.get(a).add(b)
}

const groupById = new Map(groups.map(g => [g.id, g]))
const nowSec = Math.floor(Date.now() / 1000)

const clusters = []
for (const members of rawClusters) {
  const groupCounts = new Map()
  for (const jid of members) for (const gid of contactGroups.get(jid) ?? []) groupCounts.set(gid, (groupCounts.get(gid) ?? 0) + 1)
  const sharedGroupIds = [...groupCounts.entries()].filter(([, c]) => c >= 2).map(([gid]) => gid)
  if (sharedGroupIds.length < 2) continue
  if (members.length > 100) continue
  const allLarge = sharedGroupIds.every(gid => (groupById.get(gid)?.members.length ?? 0) > 40)
  if (allLarge) continue

  const memberSet = new Set(members)
  let bestGroupJid = sharedGroupIds[0]
  let bestOverlap = 0
  for (const gid of sharedGroupIds) {
    const g = groupById.get(gid)
    if (!g) continue
    const overlap = g.members.filter(m => memberSet.has(m)).length / g.members.length
    if (overlap > bestOverlap) { bestOverlap = overlap; bestGroupJid = gid }
  }

  const timestamps = sharedGroupIds.map(gid => groupById.get(gid)?.createdAt ?? groupById.get(gid)?.lastMessageAt ?? 0).filter(t => t > 0).sort((a, b) => a - b)
  const eraStart = timestamps.length > 0 ? timestamps[0] : 0
  const lastActivity = Math.max(...sharedGroupIds.map(gid => groupById.get(gid)?.lastMessageAt ?? 0))
  const eraEnd = (nowSec - lastActivity) > 90 * 86400 ? lastActivity : null

  let linkedPairs = 0, totalPairs = 0
  for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
    totalPairs++
    if (adjacency.get(members[i])?.has(members[j])) linkedPairs++
  }
  const cohesion = totalPairs > 0 ? linkedPairs / totalPairs : 0

  clusters.push({
    contacts: members.map(jid => ({ jid })),
    sharedGroups: sharedGroupIds,
    bestGroupJid,
    bestGroupName: groupById.get(bestGroupJid)?.name ?? '',
    eraStart, eraEnd, cohesion,
  })
}

// ─── Post-Louvain merge pass (verbatim from whatsapp.ts) ───────────────────
function mergeScore(a, b, nowSec) {
  const aEnd = a.eraEnd ?? nowSec, bEnd = b.eraEnd ?? nowSec
  const overlapStart = Math.max(a.eraStart, b.eraStart)
  const overlapEnd = Math.min(aEnd, bEnd)
  let temporalScore = 0
  if (overlapEnd > overlapStart) {
    const overlapDuration = overlapEnd - overlapStart
    const longerSpan = Math.max(aEnd - a.eraStart, bEnd - b.eraStart)
    temporalScore = Math.min(overlapDuration / Math.max(longerSpan, 1), 1)
  }
  const aJids = new Set(a.contacts.map(c => c.jid))
  const bJids = new Set(b.contacts.map(c => c.jid))
  const intersection = [...aJids].filter(j => bJids.has(j)).length
  const union = new Set([...aJids, ...bJids]).size
  const jaccardScore = union > 0 ? intersection / union : 0
  const words = name => name.toLowerCase().split(/\W+/).filter(w => w.length >= 3)
  const aWords = new Set(words(a.bestGroupName))
  const bWords = words(b.bestGroupName)
  const sharedWords = bWords.filter(w => aWords.has(w)).length
  const totalUniqueWords = new Set([...aWords, ...bWords]).size
  const nameScore = totalUniqueWords > 0 ? sharedWords / totalUniqueWords : 0
  return temporalScore * 0.6 + jaccardScore * 0.3 + nameScore * 0.1
}
function mergePair(a, b) {
  const seen = new Set(); const contacts = []
  for (const c of [...a.contacts, ...b.contacts]) if (!seen.has(c.jid)) { seen.add(c.jid); contacts.push(c) }
  const sharedGroups = [...new Set([...a.sharedGroups, ...b.sharedGroups])]
  const eraStart = Math.min(a.eraStart, b.eraStart)
  const eraEnd = (a.eraEnd !== null && b.eraEnd !== null) ? Math.max(a.eraEnd, b.eraEnd) : null
  const primary = a.cohesion >= b.cohesion ? a : b
  const totalContacts = a.contacts.length + b.contacts.length
  const cohesion = totalContacts > 0 ? (a.cohesion * a.contacts.length + b.cohesion * b.contacts.length) / totalContacts : 0
  return { contacts, sharedGroups, bestGroupJid: primary.bestGroupJid, bestGroupName: primary.bestGroupName, eraStart, eraEnd, cohesion }
}
function mergeClusters(clusters, nowSec) {
  let result = [...clusters], changed = true
  while (changed) {
    changed = false
    let bestScore = 0, bestI = -1, bestJ = -1
    for (let i = 0; i < result.length; i++) for (let j = i + 1; j < result.length; j++) {
      const score = mergeScore(result[i], result[j], nowSec)
      if (score > bestScore) { bestScore = score; bestI = i; bestJ = j }
    }
    if (bestScore >= 0.5) {
      const mergedPair = mergePair(result[bestI], result[bestJ])
      result = result.filter((_, idx) => idx !== bestI && idx !== bestJ)
      result.push(mergedPair)
      changed = true
    }
  }
  return result
}
const merged = mergeClusters(clusters, nowSec)
merged.sort((a, b) => (b.cohesion * b.contacts.length) - (a.cohesion * a.contacts.length))

// ─── Report ─────────────────────────────────────────────────────────────
console.log(`Raw Louvain communities >=2 members: ${rawClusters.length}`)
console.log(`Clusters surviving shared-group/size/large-group filters: ${clusters.length}`)
console.log(`Clusters after merge pass: ${merged.length}\n`)
console.log('='.repeat(100))

for (const c of merged) {
  const groupList = c.sharedGroups.map(gid => `${groupById.get(gid)?.name ?? gid}`).join(' | ')
  const startY = c.eraStart > 0 ? new Date(c.eraStart * 1000).getFullYear() : '?'
  const endY = c.eraEnd ? new Date(c.eraEnd * 1000).getFullYear() : 'now'
  console.log(`\n[cohesion=${c.cohesion.toFixed(2)}] [${c.contacts.length} contacts] era ${startY}-${endY}`)
  console.log(`  best group: ${c.bestGroupName}`)
  console.log(`  all shared groups (${c.sharedGroups.length}): ${groupList}`)
}
