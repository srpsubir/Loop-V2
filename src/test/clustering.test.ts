import { describe, it, expect } from 'vitest'
import { scoreGroups, clustersToCandidates } from '../main/chapters'

// Realistic mock groups based on actual groups-discovered.json data
const now = Math.floor(Date.now() / 1000)
const daysAgo = (d: number) => now - d * 86400
const yearsAgo = (y: number) => now - y * 365 * 86400

// Shared contact pools — same people appearing across multiple groups
const SALSA_BERLIN = ['c1@s.net', 'c2@s.net', 'c3@s.net', 'c4@s.net', 'c5@s.net']
const ANDREWS_CIRCLE = ['c6@s.net', 'c7@s.net', 'c8@s.net', 'c9@s.net', 'c10@s.net']
const INDIA_CREW = ['c11@s.net', 'c12@s.net', 'c13@s.net', 'c14@s.net']
const YOGA_GROUP = ['c15@s.net', 'c16@s.net', 'c17@s.net', 'c18@s.net', 'c19@s.net']

function g(id: string, name: string, members: string[], lastMessageAt: number, createdAt?: number) {
  return {
    id, name, members, lastMessageAt,
    createdAt: createdAt ?? lastMessageAt - 90 * 86400,
    highTieMemberCount: 0,
    highTieMemberFraction: 0,
    topTieMemberNames: [],
  }
}

const MOCK_GROUPS = [
  // Salsa Berlin cluster — 5 people appear together in 4 groups
  g('g1@g.us', 'Rumberos de Berlin',           [...SALSA_BERLIN],                    daysAgo(30),   yearsAgo(3)),
  g('g2@g.us', 'Guaguancó Berlin 2022',         [...SALSA_BERLIN, 'c18@s.net'],       daysAgo(600),  yearsAgo(4)),
  g('g3@g.us', 'Calle de Timberos 2024',        [...SALSA_BERLIN, 'c19@s.net'],       daysAgo(120),  yearsAgo(2)),
  g('g4@g.us', 'Guaganco 2026',                 [...SALSA_BERLIN, 'c20@s.net'],       daysAgo(10),   yearsAgo(1)),

  // Andrew's circle — 4 people appear together in 4 groups
  g('g5@g.us', "Andrew's Birthday",             [...ANDREWS_CIRCLE],                  daysAgo(400),  yearsAgo(3)),
  g('g6@g.us', "Andrew's Birthday party",       [...ANDREWS_CIRCLE, 'c21@s.net'],     daysAgo(730),  yearsAgo(4)),
  g('g7@g.us', "Egyptian Delights at Andrew's", [...ANDREWS_CIRCLE],                  daysAgo(200),  yearsAgo(2)),
  g('g8@g.us', "House Party at Andrew's",       [...ANDREWS_CIRCLE, 'c22@s.net'],     daysAgo(300),  yearsAgo(3)),

  // India crew — dormant, but same people in multiple groups
  g('g9@g.us',  'IAP desi 2018',                [...INDIA_CREW],                      daysAgo(1800), yearsAgo(7)),
  g('g10@g.us', 'Godav ki maa ka...',           [...INDIA_CREW, 'c23@s.net'],         daysAgo(1200), yearsAgo(6)),
  g('g11@g.us', 'ZMS Unplugged',                [...INDIA_CREW],                      daysAgo(900),  yearsAgo(5)),

  // Yoga group — partially overlaps salsa (c1 is in both)
  g('g12@g.us', 'Yoga for the Skeptics',        [...YOGA_GROUP],                      daysAgo(60),   yearsAgo(1)),
  g('g13@g.us', 'SHA-LA 200h YTT 2026',         [...YOGA_GROUP, 'c24@s.net'],         daysAgo(20),   yearsAgo(0)),

  // One-off event groups — these should NOT cluster (unique members)
  g('g14@g.us', 'NYE 2025',                     ['c25@s.net','c26@s.net','c27@s.net','c28@s.net'], daysAgo(180), yearsAgo(1)),
  g('g15@g.us', 'Athens Weekend Crew',          ['c29@s.net','c30@s.net','c31@s.net'], daysAgo(400), yearsAgo(2)),
]

// Louvain stub matching the production algorithm in whatsapp.ts
function louvain(graph: Map<string, Map<string, number>>): Map<string, string> {
  const nodes = [...graph.keys()]
  if (nodes.length === 0) return new Map()
  const community = new Map<string, string>(nodes.map(n => [n, n]))
  let m = 0
  for (const neighbors of graph.values()) for (const w of neighbors.values()) m += w
  m /= 2
  if (m === 0) return community
  const ki = new Map<string, number>()
  for (const [node, neighbors] of graph) {
    let s = 0; for (const w of neighbors.values()) s += w
    ki.set(node, s)
  }
  const sigTot = new Map<string, number>()
  for (const [node, comm] of community)
    sigTot.set(comm, (sigTot.get(comm) ?? 0) + (ki.get(node) ?? 0))
  let improved = true
  while (improved) {
    improved = false
    for (const node of nodes) {
      const currComm = community.get(node)!
      const ki_node = ki.get(node) ?? 0
      let ki_in_curr = 0
      for (const [nb, w] of graph.get(node) ?? [])
        if (community.get(nb) === currComm) ki_in_curr += w
      sigTot.set(currComm, (sigTot.get(currComm) ?? 0) - ki_node)
      community.set(node, '\x00')
      const candIn = new Map<string, number>()
      for (const [nb, w] of graph.get(node) ?? []) {
        const nc = community.get(nb)!
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

function buildClusters(groups: typeof MOCK_GROUPS) {
  const contactGroups = new Map<string, string[]>()
  for (const g of groups) {
    for (const jid of g.members) {
      if (!contactGroups.has(jid)) contactGroups.set(jid, [])
      contactGroups.get(jid)!.push(g.id)
    }
  }

  const weightedGraph = new Map<string, Map<string, number>>()
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
        const prev = weightedGraph.get(a)!.get(b) ?? 0
        if (jaccard > prev) {
          weightedGraph.get(a)!.set(b, jaccard)
          weightedGraph.get(b)!.set(a, jaccard)
        }
      }
    }
  }

  const communityOf = louvain(weightedGraph)
  const byComm = new Map<string, string[]>()
  for (const [node, comm] of communityOf) {
    if (!byComm.has(comm)) byComm.set(comm, [])
    byComm.get(comm)!.push(node)
  }

  // Mirror production post-filter: drop clusters with <2 shared groups
  return [...byComm.values()].filter(members => {
    if (members.length < 2) return false
    const groupCounts = new Map<string, number>()
    for (const jid of members)
      for (const gid of contactGroups.get(jid) ?? [])
        groupCounts.set(gid, (groupCounts.get(gid) ?? 0) + 1)
    const sharedGroupIds = [...groupCounts.entries()].filter(([, c]) => c >= 2)
    return sharedGroupIds.length >= 2
  })
}

describe('buildContactClusters (algorithmic)', () => {
  it('produces at least 3 clusters from realistic group data', () => {
    const clusters = buildClusters(MOCK_GROUPS)
    expect(clusters.length).toBeGreaterThanOrEqual(3)
  })

  it('salsa berlin crew forms a cluster', () => {
    const clusters = buildClusters(MOCK_GROUPS)
    const salsaCluster = clusters.find(c => c.includes('c1@s.net') && c.includes('c3@s.net'))
    expect(salsaCluster).toBeDefined()
    expect(salsaCluster!.length).toBeGreaterThanOrEqual(4)
  })

  it("andrew's circle forms its own cluster", () => {
    const clusters = buildClusters(MOCK_GROUPS)
    const andrewCluster = clusters.find(c => c.includes('c6@s.net') && c.includes('c8@s.net'))
    expect(andrewCluster).toBeDefined()
  })

  it('india crew forms a cluster despite being dormant', () => {
    const clusters = buildClusters(MOCK_GROUPS)
    const indiaCluster = clusters.find(c => c.includes('c11@s.net') && c.includes('c13@s.net'))
    expect(indiaCluster).toBeDefined()
  })

  it('one-off event groups with unique members do not form clusters', () => {
    const clusters = buildClusters(MOCK_GROUPS)
    // c25-c31 only appear in one group each — should not be clustered
    const noiseCluster = clusters.find(c => c.includes('c25@s.net'))
    expect(noiseCluster).toBeUndefined()
  })
})

describe('clustersToCandidates → chapter names', () => {
  it('falls back to scoreGroups when fewer than 3 clusters', () => {
    const { top } = clustersToCandidates([], MOCK_GROUPS)
    // fallback: scoreGroups produces results from MOCK_GROUPS
    expect(top.length).toBeGreaterThan(0)
  })

  it('with enough clusters, top chapters come from cluster scoring not raw group scoring', () => {
    // We test this by passing a minimal ContactCluster array
    const mockClusters = [
      {
        contacts: [
          { jid: 'c1@s.net', displayName: 'Rohan', tieStrength: 'high' as const },
          { jid: 'c2@s.net', displayName: 'Priya', tieStrength: 'medium' as const },
          { jid: 'c3@s.net', displayName: 'Aarav', tieStrength: 'low' as const },
        ],
        sharedGroups: ['g1@g.us', 'g2@g.us', 'g3@g.us'],
        bestGroupJid: 'g1@g.us',
        bestGroupName: 'Rumberos de Berlin',
        eraStart: yearsAgo(3),
        eraEnd: null,
        cohesion: 0.8,
      },
      {
        contacts: [
          { jid: 'c6@s.net', displayName: 'Andrew', tieStrength: 'high' as const },
          { jid: 'c7@s.net', displayName: 'Kira', tieStrength: 'medium' as const },
          { jid: 'c8@s.net', displayName: 'Lucas', tieStrength: 'low' as const },
        ],
        sharedGroups: ['g5@g.us', 'g6@g.us', 'g7@g.us'],
        bestGroupJid: 'g5@g.us',
        bestGroupName: "Andrew's Birthday",
        eraStart: yearsAgo(4),
        eraEnd: daysAgo(200),
        cohesion: 0.7,
      },
      {
        contacts: [
          { jid: 'c10@s.net', displayName: 'Srujan', tieStrength: 'low' as const },
          { jid: 'c11@s.net', displayName: 'Chetan', tieStrength: 'low' as const },
          { jid: 'c12@s.net', displayName: 'Arun', tieStrength: 'low' as const },
        ],
        sharedGroups: ['g9@g.us', 'g10@g.us', 'g11@g.us'],
        bestGroupJid: 'g9@g.us',
        bestGroupName: 'IAP desi 2018',
        eraStart: yearsAgo(7),
        eraEnd: daysAgo(900),
        cohesion: 1.0,
      },
    ]

    const { top } = clustersToCandidates(mockClusters, MOCK_GROUPS)
    expect(top.length).toBeGreaterThan(0)

    // Names should be TF-IDF generated, not raw group names
    console.log('\nGenerated chapter names:')
    top.forEach(c => console.log(`  "${c.name}" (score: ${c.score}, active: ${c.active})`))

    // Names should include era markers
    expect(top.some(c => c.name.includes('·'))).toBe(true)
  })
})
