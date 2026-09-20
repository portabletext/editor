import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

// No alias to `@portabletext/editor`'s `src/`: this build must resolve the
// package through its normal `package.json` exports (the `default`
// condition, which points at the built `lib/`), the same way a real
// consumer would.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
