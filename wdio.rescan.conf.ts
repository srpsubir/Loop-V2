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

  services: ['electron'],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: { ui: 'bdd', timeout: 150_000 },
}
