// Run clustering + naming on cached groups-discovered.json — no live WA needed.
// Usage: node scripts/test-clustering.mjs

import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const CACHE = join(homedir(), 'Documents', 'Loop', 'groups-discovered.json')
const STOP = new Set([
  'the','a','an','and','or','in','at','of','to','for','is','are','was','were',
  'with','on','by','from','as','we','my','our','your','this','that','it','be',
  'have','has','had','will','would','can','could','not','no','but','if','so',
  'all','just','out','up','do','did','get','got','go','let','new','old','one',
  'group','chat','whatsapp','subir',
])

let groups
try {
  groups = JSON.parse(readFileSync(CACHE, 'utf8'))
} catch {
  console.error('groups-discovered.json not found or empty — connect WA and trigger chapter detection first')
  process.exit(1)
}

if (groups.length === 0) {
  console.error('groups-discovered.json is empty — connect WA and trigger chapter detection first')
  process.exit(1)
}

console.log(`\nLoaded ${groups.length} groups from cache`)

// Apply same pre-filters as listGroupsWithMeta() in whatsapp.ts
const GARBAGE_NAME_RE = /\b(broadcast|announce|announcement|update|updates|news|newsletter|society|alumni|association|residents|colony|welfare|committee|notices?|info|helpdesk|support|class of|batch of|school of|investor meet|networking event)\b/i
groups = groups.filter(g => {
  if (!g.name) return false
  if (g.members.length < 3) return false
  if (g.members.length > 50) return false
  if (GARBAGE_NAME_RE.test(g.name)) return false
  return true
})
console.log(`After garbage filter: ${groups.length} groups\n`)

// Build contact → groups index
const contactGroups = new Map()
for (const g of groups) {
  for (const jid of g.members) {
    if (!contactGroups.has(jid)) contactGroups.set(jid, [])
    contactGroups.get(jid).push(g.id)
  }
}

// Louvain modularity optimisation (mirrors whatsapp.ts)
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
  for (const [node, comm] of community)
    sigTot.set(comm, (sigTot.get(comm) ?? 0) + (ki.get(node) ?? 0))
  let improved = true
  while (improved) {
    improved = false
    for (const node of nodes) {
      const currComm = community.get(node)
      const ki_node = ki.get(node) ?? 0
      let ki_in_curr = 0
      for (const [nb, w] of graph.get(node) ?? [])
        if (community.get(nb) === currComm) ki_in_curr += w
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

// Bipartite projection → weighted graph (Jaccard ≥ 0.2), then Louvain
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
      if (!weightedGraph.has(a)) weightedGraph.set(a, new Map())
      if (!weightedGraph.has(b)) weightedGraph.set(b, new Map())
      const prev = weightedGraph.get(a).get(b) ?? 0
      if (jaccard > prev) {
        weightedGraph.get(a).set(b, jaccard)
        weightedGraph.get(b).set(a, jaccard)
      }
    }
  }
}

const communityOf = louvain(weightedGraph)
const byComm = new Map()
for (const [node, comm] of communityOf) {
  if (!byComm.has(comm)) byComm.set(comm, [])
  byComm.get(comm).push(node)
}
const clusters = [...byComm.values()].filter(c => c.length >= 2)

// Binary adjacency view for cohesion computation
const adjacency = new Map()
for (const [a, neighbors] of weightedGraph) {
  if (!adjacency.has(a)) adjacency.set(a, new Set())
  for (const [b] of neighbors) adjacency.get(a).add(b)
}

console.log(`Clusters found: ${clusters.length}`)
if (clusters.length < 3) {
  console.log('⚠ < 3 clusters — fallback to scoreGroups() will fire in production\n')
}

// Map clusters to chapter candidates
const groupById = new Map(groups.map(g => [g.id, g]))
const now = Math.floor(Date.now() / 1000)

function nameCluster(bestGroupName, eraStart, eraEnd) {
  const words = bestGroupName
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w))
  const kw = [...new Set(words)].slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1))
  const label = kw.length ? kw.join(' ') : bestGroupName
  const sy = eraStart > 0 ? new Date(eraStart * 1000).getFullYear() : null
  const ey = eraEnd ? new Date(eraEnd * 1000).getFullYear() : null
  const era = sy ? (ey && ey !== sy ? `${sy}–${ey}` : ey === sy ? `${sy}` : `${sy}–now`) : null
  return era ? `${label} · ${era}` : label
}

const results = clusters.map(members => {
  const memberSet = new Set(members)
  const groupCounts = new Map()
  for (const jid of members) {
    for (const gid of contactGroups.get(jid) ?? []) {
      groupCounts.set(gid, (groupCounts.get(gid) ?? 0) + 1)
    }
  }
  const sharedGroupIds = [...groupCounts.entries()].filter(([, c]) => c >= 2).map(([gid]) => gid)
  if (sharedGroupIds.length < 2) return null

  let bestGroupJid = sharedGroupIds[0], bestOverlap = 0
  for (const gid of sharedGroupIds) {
    const g = groupById.get(gid)
    if (!g) continue
    const overlap = g.members.filter(m => memberSet.has(m)).length / g.members.length
    if (overlap > bestOverlap) { bestOverlap = overlap; bestGroupJid = gid }
  }

  const bestGroup = groupById.get(bestGroupJid)
  const timestamps = sharedGroupIds.map(gid => groupById.get(gid)?.createdAt ?? 0).filter(t => t > 0).sort((a, b) => a - b)
  const eraStart = timestamps[0] ?? 0
  const lastActivity = Math.max(...sharedGroupIds.map(gid => groupById.get(gid)?.lastMessageAt ?? 0))
  const eraEnd = (now - lastActivity) > 90 * 86400 ? lastActivity : null

  let linkedPairs = 0, totalPairs = 0
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      totalPairs++
      if (adjacency.get(members[i])?.has(members[j])) linkedPairs++
    }
  }
  const cohesion = totalPairs > 0 ? linkedPairs / totalPairs : 0
  const ageDays = lastActivity > 0 ? (now - lastActivity) / 86400 : 9999
  const active = ageDays < 90
  const recency = ageDays < 90 ? 30 : ageDays < 365 ? 20 : ageDays < 730 ? 12 : ageDays < 1095 ? 6 : 2
  const score = Math.min(100, Math.round(cohesion * 50) + recency)

  return {
    name: nameCluster(bestGroup?.name ?? bestGroupJid, eraStart, eraEnd),
    representativeGroup: bestGroup?.name ?? bestGroupJid,
    memberCount: members.length,
    sharedGroups: sharedGroupIds.map(gid => groupById.get(gid)?.name ?? gid),
    cohesion: cohesion.toFixed(2),
    score,
    active,
  }
}).filter(Boolean).sort((a, b) => b.score - a.score)

console.log('\n── Top chapter candidates ──────────────────────────────')
results.slice(0, 10).forEach((r, i) => {
  const status = r.active ? '● active' : '○ closed'
  console.log(`\n${i + 1}. "${r.name}" [${status}] score:${r.score} cohesion:${r.cohesion}`)
  console.log(`   From: ${r.representativeGroup}`)
  console.log(`   Shared groups: ${r.sharedGroups.slice(0,3).join(', ')}${r.sharedGroups.length > 3 ? ` +${r.sharedGroups.length-3}` : ''}`)
  console.log(`   People in cluster: ${r.memberCount}`)
})
console.log('\n────────────────────────────────────────────────────────')
console.log(`Total clusters: ${results.length} | Would show top 5 in app\n`)
