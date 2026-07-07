import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// framer-motion AnimatePresence blocks screen transitions in jsdom — animations never complete.
// Stub to passthrough so screens render immediately in tests.
vi.mock('framer-motion', () => ({
  motion: new Proxy({} as Record<string, unknown>, {
    get: (_target, prop: string) => (props: Record<string, unknown>) => {
      const { children, initial: _i, animate: _a, exit: _e, transition: _t, ...rest } = props
      return React.createElement(prop, rest, children)
    },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))
