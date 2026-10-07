import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// React 19 setup:
// - @vitejs/plugin-react enables Fast Refresh in dev and the automatic JSX runtime.
// - `compiler: true` turns on the React Compiler for automatic memoization.
export default defineConfig({
  plugins: [
    react({
      compiler: true,
    }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
