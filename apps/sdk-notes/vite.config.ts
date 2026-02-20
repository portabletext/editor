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
      '@portabletext/patches': path.resolve(
        __dirname,
        '../../packages/patches/src',
      ),
      '@portabletext/plugin-sdk-value': path.resolve(
        __dirname,
        '../../packages/plugin-sdk-value/src',
      ),
      '@portabletext/schema': path.resolve(
        __dirname,
        '../../packages/schema/src',
      ),
    },
  },
})
