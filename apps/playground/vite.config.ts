import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {plugins: [['babel-plugin-react-compiler', {target: '19'}]]},
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@portabletext/editor': path.resolve(
        __dirname,
        '../../packages/editor/src',
      ),
      '@portabletext/block-tools': path.resolve(
        __dirname,
        '../../packages/block-tools/src',
      ),
      '@portabletext/keyboard-shortcuts': path.resolve(
        __dirname,
        '../../packages/keyboard-shortcuts/src',
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
      '@portabletext/toolbar': path.resolve(
        __dirname,
        '../../packages/toolbar/src',
      ),
      '@portabletext/schema': path.resolve(
        __dirname,
        '../../packages/schema/src',
      ),
      '@portabletext/sanity-bridge': path.resolve(
        __dirname,
        '../../packages/sanity-bridge/src',
      ),
    },
  },
})
