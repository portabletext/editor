import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

export default defineConfig({
  root: 'page',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rolldownOptions: {
      input: {editor: 'page/editor.html', plain: 'page/plain.html'},
    },
  },
})
