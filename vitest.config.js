import { defineConfig } from 'vitest/config'

// The unit tests cover the pure helpers in src/lib and src/data, so they run in
// a plain Node environment without the React plugin.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
