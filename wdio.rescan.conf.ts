import { join, resolve } from 'path'
import type { Options } from '@wdio/types'

// Manual-only config for scripts/verify-group-rescan.spec.ts — deliberately
// NOT wired into test:ipc/test:all (see that spec file's header comment for
// why). Longer timeouts than wdio.conf.ts: WhatsApp reconnect + the 90s
// group-metadata fetch budget in fetchRealGroupMembers() need real headroom.
export const config: Options.Testrunner = {
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: { project: resolve('tsconfig.node.json'), transpileOnly: true },
  },

  specs: ['src/test/electron/wdio/verify-group-rescan.spec.ts'],
  exclude: [],
  maxInstances: 1,
  capabilities: [{
    browserName: 'electron',
    'wdio:electronServiceOptions': {
      appBinaryPath: join(
        __dirname,
        'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'
      ),
      appEntryPoint: join(__dirname, 'out/main/index.js'),
      appArgs: ['--loop-e2e-test'],
    },
  }],

  logLevel: 'error',
  bail: 0,
  waitforTimeout: 15000,
  connectionRetryTimeout: 150000,
  connectionRetryCount: 3,

  // Default cdpBridgeTimeout is a hardcoded 10s (@wdio/cdp-bridge's
  // REQUEST_TIMEOUT) — the service waits for the app's *first* window to
  // fire Runtime.executionContextCreated before the session is even usable,
  // independent of waitforTimeout/mochaOpts.timeout/connectionRetryTimeout
  // above (none of those touch this). This app's main process does real
  // work (LoopData reads, WhatsApp reconnect kickoff) before the renderer's
  // default execution context exists, and 10s isn't reliably enough headroom
  // on a cold launch — this was the actual "Timeout exceeded to get the
  // ContextId" failure, not the WhatsApp-reconnect wait in the spec itself
  // (that has its own 90s waitUntil and was never reached).
  services: [['electron', { cdpBridgeTimeout: 60_000 }]],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: { ui: 'bdd', timeout: 150_000 },
}
