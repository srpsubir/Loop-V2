#!/usr/bin/env node
// MAV-253: mechanical gate for color-token compliance.
//
// The locked palette lives as CSS custom properties in
// src/renderer/src/styles/globals.css (--ink, --terracotta, --surface, etc.).
// Components should reference them via var(--token-name) in inline styles,
// not raw hex/rgba literals — otherwise colors silently drift from the
// documented palette with nothing to catch it (see MAV-253 for the incident
// that prompted this).
//
// Ratchet/baseline pattern: retrofitting this onto 309 pre-existing raw-color
// occurrences across the renderer in one pass would be its own large, risky
// refactor (some are legitimate — e.g. Google's brand colors in the sign-in
// screen — not everything should be tokenized). Instead this script snapshots
// today's known occurrences in color-token-baseline.json and only fails on
// NEW occurrences introduced after this baseline was captured. Clearing the
// baseline over time is tracked separately, not blocking.
//
// Usage: node scripts/check-color-tokens.mjs [--update-baseline]

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const RENDERER_SRC = join(ROOT, 'src/renderer/src')
const BASELINE_FILE = join(__dirname, 'color-token-baseline.json')
const COLOR_RE = /#[0-9A-Fa-f]{6}\b|rgba?\([^)]+\)/g

function listTsxFiles() {
  const out = execSync(`find "${RENDERER_SRC}" -name "*.tsx" -not -path "*/styles/*"`, {
    encoding: 'utf-8',
  })
  return out.split('\n').filter(Boolean)
}

function findViolations() {
  // Keyed on file:color, not file:line:color — deliberately robust to line
  // shifts from unrelated edits in the same file (an earlier version of this
  // script keyed on exact line number and produced false "new violation"
  // reports every time a preceding line was touched).
  const violations = new Set()
  for (const file of listTsxFiles()) {
    const rel = file.replace(ROOT + '/', '')
    const text = readFileSync(file, 'utf-8')
    const matches = text.match(COLOR_RE)
    if (matches) {
      for (const m of matches) violations.add(`${rel}:${m}`)
    }
  }
  return [...violations].sort()
}

const violations = findViolations()

if (process.argv.includes('--update-baseline')) {
  writeFileSync(BASELINE_FILE, JSON.stringify(violations, null, 2) + '\n')
  console.log(`[check-color-tokens] Baseline updated: ${violations.length} known occurrences.`)
  process.exit(0)
}

if (!existsSync(BASELINE_FILE)) {
  console.error('[check-color-tokens] No baseline found. Run with --update-baseline first.')
  process.exit(1)
}

const baseline = new Set(JSON.parse(readFileSync(BASELINE_FILE, 'utf-8')))
const current = new Set(violations)
const newViolations = violations.filter((v) => !baseline.has(v))
const fixed = [...baseline].filter((v) => !current.has(v))

if (fixed.length > 0) {
  console.log(`[check-color-tokens] ${fixed.length} baseline violation(s) fixed since last snapshot — consider running --update-baseline to shrink the baseline.`)
}

if (newViolations.length > 0) {
  console.error(`[check-color-tokens] ${newViolations.length} NEW raw color literal(s) found outside the token system:\n`)
  for (const v of newViolations) console.error(`  ${v}`)
  console.error('\nUse var(--token-name) from src/renderer/src/styles/globals.css instead, or add a justified exception.')
  process.exit(1)
}

console.log(`[check-color-tokens] OK — no new raw color literals (${baseline.size} pre-existing tracked in baseline).`)
