/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import {defineWorkspace} from 'vitest/config'

export default defineWorkspace([
  {
    plugins: [react()],
    test: {
      name: 'browser',
      include: ['gherkin-tests/**/*.test.ts'],
      browser: {
        enabled: true,
        headless: true,
        provider: 'playwright',
        name: 'chromium',
        screenshotFailures: false,
      },
    },
  },
  {
    plugins: [react()],
    test: {
      name: 'unit',
      exclude: ['node_modules', 'e2e-tests', 'gherkin-tests'],
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
    },
  },
])
