import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

export default defineConfig({
  plugins: [
    react({
      babel: (id) => {
        const isVendoredSlate =
          id.includes('/src/slate/') ||
          id.includes('/src/slate-dom/') ||
          id.includes('/src/slate-react/')
        return {
          plugins: isVendoredSlate
            ? []
            : [['babel-plugin-react-compiler', {target: '19'}]],
        }
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
      '@portabletext/markdown': path.resolve(
        __dirname,
        '../../packages/markdown/src',
      ),
      '@portabletext/plugin-markdown-shortcuts': path.resolve(
        __dirname,
        '../../packages/plugin-markdown-shortcuts/src',
      ),
      '@portabletext/schema': path.resolve(
        __dirname,
        '../../packages/schema/src',
      ),
    },
  },
})
