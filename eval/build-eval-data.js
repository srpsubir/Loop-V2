#!/usr/bin/env node
// Merges live groups-discovered.json (from app) with labeled real-groups.json.
// Run after connecting WhatsApp in the app:
//   node eval/build-eval-data.js

const fs = require('fs')
const path = require('path')
const os = require('os')

const discoveredPath = path.join(os.homedir(), 'Documents', 'Loop', 'groups-discovered.json')
const labelsPath = path.join(__dirname, 'real-groups.json')

if (!fs.existsSync(discoveredPath)) {
  console.error('groups-discovered.json not found. Start the app, connect WhatsApp, and wait for the group scan to complete.')
  process.exit(1)
}

const discovered = JSON.parse(fs.readFileSync(discoveredPath, 'utf8'))
const existing = JSON.parse(fs.readFileSync(labelsPath, 'utf8'))

// Build label lookup keyed by group name
const labels = {}
existing.forEach(t => {
  labels[t.vars.groupName.trim()] = {
    expectedIsChapter: t.vars.expectedIsChapter,
    // Keep manual avgTieStrength annotation only if live data didn't produce one
    manualAvgTieStrength: t.vars.avgTieStrength,
  }
})

const toDateStr = ts => ts ? new Date(ts * 1000).toISOString().split('T')[0] : '1970-01-01'

let written = 0
let skipped = 0

const merged = discovered
  .map(g => {
    const label = labels[g.name?.trim()]
    if (!label || label.expectedIsChapter === null || label.expectedIsChapter === undefined) {
      skipped++
      return null
    }

    return {
      description: g.name,
      vars: {
        groupName: g.name,
        memberCount: g.members?.length ?? 0,
        lastMessageAt: toDateStr(g.lastMessageAt),
        active: String((Date.now() / 1000 - g.lastMessageAt) < 90 * 86400),
        createdAt: toDateStr(g.createdAt),
        avgTieStrength: g.avgTieStrength ?? label.manualAvgTieStrength ?? null,
        userIsCreator: g.userIsCreator ?? null,
        mySharePercent: g.mySharePercent != null ? Math.round(g.mySharePercent * 100) + '%' : null,
        groupParticipationRatio: g.groupParticipationRatio != null ? Math.round(g.groupParticipationRatio * 100) + '%' : null,
        burstiness: g.burstiness != null ? Math.round(g.burstiness * 100) / 100 : null,
        lastMessagesSample: g.lastMessagesSample ?? null,
        expectedIsChapter: label.expectedIsChapter,
      }
    }
  })
  .filter(Boolean)

fs.writeFileSync(labelsPath, JSON.stringify(merged, null, 2))
written = merged.length

console.log(`Done. ${written} labeled groups written to eval/real-groups.json (${skipped} unlabeled groups skipped).`)
console.log(`Run: npx promptfoo eval --config eval/promptfooconfig-real.yaml`)
