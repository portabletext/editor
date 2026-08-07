import path from 'node:path'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, {reactCompilerPreset} from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({
      // Overriding `exclude` replaces the plugin's defaults, so Rolldown's
      // runtime helper has to be re-listed alongside the vendored engine.
      exclude: [
        /[/\\]node_modules[/\\]/,
        /\0rolldown\/runtime\.js/,
        /[/\\]src[/\\]engine[/\\]/,
      ],
      presets: [reactCompilerPreset({target: '19'})],
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@portabletext/editor': path.resolve(
        __dirname,
        '../../packages/editor/src',
      ),
      '@portabletext/keyboard-shortcuts': path.resolve(
        __dirname,
        '../../packages/keyboard-shortcuts/src',
      ),
      '@portabletext/html': path.resolve(__dirname, '../../packages/html/src'),
      '@portabletext/markdown': path.resolve(
        __dirname,
        '../../packages/markdown/src',
      ),
      '@portabletext/patches': path.resolve(
        __dirname,
        '../../packages/patches/src',
      ),
      '@portabletext/plugin-emoji-picker': path.resolve(
        __dirname,
        '../../packages/plugin-emoji-picker/src',
      ),
      '@portabletext/plugin-input-rule': path.resolve(
        __dirname,
        '../../packages/plugin-input-rule/src',
      ),
      '@portabletext/plugin-markdown-shortcuts': path.resolve(
        __dirname,
        '../../packages/plugin-markdown-shortcuts/src',
      ),
      '@portabletext/plugin-one-line': path.resolve(
        __dirname,
        '../../packages/plugin-one-line/src',
      ),
      '@portabletext/plugin-paste-link': path.resolve(
        __dirname,
        '../../packages/plugin-paste-link/src',
      ),
      // The stylesheet is a published asset rather than a `src` module, so it
      // needs its own entry ahead of the package-wide alias.
      '@portabletext/plugin-table/ui/styles.css': path.resolve(
        __dirname,
        '../../packages/plugin-table/styles/table.css',
      ),
      '@portabletext/plugin-table': path.resolve(
        __dirname,
        '../../packages/plugin-table/src',
      ),
      '@portabletext/plugin-typeahead-picker': path.resolve(
        __dirname,
        '../../packages/plugin-typeahead-picker/src',
      ),
      '@portabletext/plugin-typography': path.resolve(
        __dirname,
        '../../packages/plugin-typography/src',
      ),
      '@portabletext/toolbar': path.resolve(
        __dirname,
        '../../packages/toolbar/src',
      ),
      '@portabletext/schema': path.resolve(
        __dirname,
        '../../packages/schema/src',
      ),
    },
  },
})
