import path from 'node:path'
import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

// Aliases redirect:
//
// - `vitest/browser` and `vitest` to our shims (so step-definitions and
//   test-editor compile and run outside a vitest worker).
// - `vitest-browser-react` to our shim (so test-editor.tsx's `render()`
//   resolves to a plain React 19 createRoot mount).
// - `@portabletext/*` packages to their workspace sources, matching the
//   playground convention so React Fast Refresh works on the underlying
//   packages.
//
// Order matters: more-specific aliases come first so `vitest/browser` is
// not caught by the `vitest` alias.

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'vitest/browser': path.resolve(
        __dirname,
        'src/runner/vitest-browser-shim.ts',
      ),
      'vitest-browser-react': path.resolve(
        __dirname,
        'src/runner/vitest-browser-react-shim.ts',
      ),
      'vitest': path.resolve(__dirname, 'src/runner/vitest-shim.ts'),
      '@portabletext/editor': path.resolve(
        __dirname,
        '../../packages/editor/src',
      ),
      '@portabletext/keyboard-shortcuts': path.resolve(
        __dirname,
        '../../packages/keyboard-shortcuts/src',
      ),
      '@portabletext/patches': path.resolve(
        __dirname,
        '../../packages/patches/src',
      ),
      '@portabletext/plugin-input-rule': path.resolve(
        __dirname,
        '../../packages/plugin-input-rule/src',
      ),
      '@portabletext/plugin-typeahead-picker': path.resolve(
        __dirname,
        '../../packages/plugin-typeahead-picker/src',
      ),
      '@portabletext/schema': path.resolve(
        __dirname,
        '../../packages/schema/src',
      ),
    },
  },
})
