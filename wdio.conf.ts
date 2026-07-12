import { join, resolve } from 'path'
import type { Options } from '@wdio/types'

export const config: Options.Testrunner = {
  runner: 'local',
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: { project: resolve('tsconfig.node.json'), transpileOnly: true },
  },

  specs: ['src/test/electron/wdio/*.test.ts'],
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
  waitforTimeout: 10000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  services: ['electron'],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: { ui: 'bdd', timeout: 30000 },
}
