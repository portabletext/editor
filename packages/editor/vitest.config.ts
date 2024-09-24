/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

export default defineConfig({
  plugins: [react()],
  test: {
    exclude: ['e2e-tests'],
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
})
