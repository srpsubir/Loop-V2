import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/main/chapters.ts', 'src/main/scanner.ts'],
    },
    server: {
      deps: {
        inline: ['@testing-library/user-event'],
      },
    },
  },
  resolve: {
    alias: {
      '@shared': resolve('src/shared'),
      '@renderer': resolve('src/renderer/src'),
      // Stub out Electron and Electron-dependent modules for unit tests
      electron: resolve('src/test/mocks/electron.ts'),
      '@sentry/electron/main': resolve('src/test/mocks/empty.ts'),
      'posthog-node': resolve('src/test/mocks/empty.ts'),
    },
  },
})
