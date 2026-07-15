import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const DISCOVERED_CACHE = join(homedir(), 'Documents', 'Loop', 'groups-discovered.json')
const STATE_FILE = join(homedir(), 'Documents', 'Loop', 'state.json')

let groups = []

if (existsSync(DISCOVERED_CACHE)) {
  const raw = JSON.parse(readFileSync(DISCOVERED_CACHE, 'utf8'))
  groups = raw.map((g) => ({
    name: g.name,
    memberCount: g.members?.length ?? 0,
    lastMessageAt: g.lastMessageAt,
    active: g.lastMessageAt > (Date.now() / 1000) - 60 * 60 * 24 * 180,
  }))
  console.log(`Read ${groups.length} groups from groups-discovered.json`)
} else {
  const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'))
  groups = [
    ...(state.detectedChapters || []),
    ...(state.pendingChapters || []),
  ]
  console.log(`Read ${groups.length} groups from state.json`)
}

if (groups.length === 0) {
  console.error('No groups found. Run a scan in Loop first (chapters:detect), then re-run this script.')
  process.exit(1)
}

const tests = groups.map((g) => ({
  description: g.name,
  vars: {
    groupName: g.name,
    memberCount: g.memberCount,
    lastMessageAt: new Date(g.lastMessageAt * 1000).toISOString().split('T')[0],
    active: String(g.active),
  },
}))

writeFileSync('eval/real-groups.json', JSON.stringify(tests, null, 2))
console.log(`Exported ${tests.length} groups to eval/real-groups.json`)
