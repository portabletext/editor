import {fileURLToPath} from 'node:url'
import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

const page = (file: string) =>
  fileURLToPath(new URL(`page/${file}`, import.meta.url))

export default defineConfig({
  root: page(''),
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('dist', import.meta.url)),
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        editor: page('editor.html'),
        plain: page('plain.html'),
        textarea: page('textarea.html'),
      },
    },
  },
})
