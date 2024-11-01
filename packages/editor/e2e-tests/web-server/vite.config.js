import viteReact from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    viteReact({
      babel: {plugins: [['babel-plugin-react-compiler', {target: '18'}]]},
    }),
  ],
  build: {
    minify: false,
  },
  server: {
    host: true,
  },
})
