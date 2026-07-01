import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 120000,
    fileParallelism: false,
    include: ['src/test/electron/app.test.ts', 'src/test/electron/osascript.test.ts', 'src/test/electron/nutjs.test.ts'],
  },
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
    },
  },
})
