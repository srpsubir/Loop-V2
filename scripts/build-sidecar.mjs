#!/usr/bin/env node
// MAV-265/task #7: builds the whatsmeow Go sidecar for both macOS
// architectures Loop already targets (electron-builder.yml's `mac.target`
// lists arm64 + x64), so packaged builds never require a local Go toolchain
// — only whoever runs this script (dev machine / CI) needs Go installed.
// Output layout matches Node's process.arch naming ('arm64'/'x64'), not
// Go's GOARCH ('arm64'/'amd64'), so resolveSidecarBinaryPath() in
// src/main/whatsapp.ts can key off process.arch directly at runtime.
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sidecarDir = join(__dirname, '..', 'sidecar')

const targets = [
  { nodeArch: 'arm64', goArch: 'arm64' },
  { nodeArch: 'x64', goArch: 'amd64' },
]

for (const { nodeArch, goArch } of targets) {
  const outDir = join(sidecarDir, 'dist', `darwin-${nodeArch}`)
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'loop-sidecar')
  console.log(`[build-sidecar] building darwin/${goArch} -> ${outPath}`)
  execFileSync('go', ['build', '-o', outPath, '.'], {
    cwd: sidecarDir,
    stdio: 'inherit',
    env: { ...process.env, GOOS: 'darwin', GOARCH: goArch, CGO_ENABLED: '0' },
  })
}

console.log('[build-sidecar] done')
