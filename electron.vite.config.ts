import { resolve } from 'path'
import { readFileSync, existsSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// `npm run dev` (electron-vite dev) never loads .env into process.env — only
// `npm run dist` does, via an explicit shell `export` before electron-builder
// runs, and that only affects the *build-time* shell, not the packaged app's
// runtime process.env. Net effect: GOOGLE_CLIENT_ID/SECRET were undefined at
// runtime in both dev AND packaged builds, so Sign-In-with-Google silently
// no-opped (_doGoogleSignIn returns null before ever calling
// shell.openExternal — "nothing happens" when clicked, no error anywhere).
// Fix: read .env here (Node context, runs at config-eval time for both dev
// and build) and inject the runtime-needed keys as build-time constants via
// `define`, so `process.env.GOOGLE_CLIENT_ID` etc. resolve to real literal
// values in the compiled main-process bundle regardless of how it's launched.
function loadDotEnv(): Record<string, string> {
  const path = resolve(__dirname, '.env')
  if (!existsSync(path)) return {}
  const env: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

const dotEnv = loadDotEnv()
const RUNTIME_ENV_KEYS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SENTRY_DSN', 'POSTHOG_KEY'] as const
const mainDefine = Object.fromEntries(
  RUNTIME_ENV_KEYS.map((key) => [`process.env.${key}`, JSON.stringify(dotEnv[key] ?? '')])
)

export default defineConfig({
  main: {
    define: mainDefine,
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()]
  }
})
