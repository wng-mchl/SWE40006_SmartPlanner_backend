import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['routes/**'],
      thresholds: {
        lines: 70,
        functions: 70,
      },
    },
  },
})
