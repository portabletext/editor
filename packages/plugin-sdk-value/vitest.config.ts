import react from '@vitejs/plugin-react'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  plugins: [
    react({
      babel: {plugins: [['babel-plugin-react-compiler', {target: '18'}]]},
    }),
  ],
  test: {
    browser: {
      enabled: true,
      headless: true,
      provider: 'playwright',
      instances: [
        {browser: 'chromium'},
        // {browser: 'firefox'},
        // {browser: 'webkit'},
      ],
    },
  },
})
