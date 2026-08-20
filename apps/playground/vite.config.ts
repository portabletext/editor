import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'
import {COMPILED_SOURCES} from '../../packages/editor/react-compiler-sources.ts'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      compiler: {
        target: '19',
        sources: [
          ...COMPILED_SOURCES,
          '/apps/playground/src/',
          '/packages/plugin-emoji-picker/src/',
          '/packages/plugin-input-rule/src/',
          '/packages/plugin-markdown-shortcuts/src/',
          '/packages/plugin-one-line/src/',
          '/packages/plugin-paste-link/src/',
          '/packages/plugin-table/src/',
          '/packages/plugin-typeahead-picker/src/',
          '/packages/plugin-typography/src/',
          '/packages/toolbar/src/',
        ],
      },
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
