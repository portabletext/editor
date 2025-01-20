/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import {defineWorkspace} from 'vitest/config'

export default defineWorkspace([
  {
    plugins: [
      react({
        babel: {plugins: [['babel-plugin-react-compiler', {target: '18'}]]},
      }),
    ],
    test: {
      name: 'browser',
      include: ['gherkin-tests/**/*.test.ts', 'gherkin-tests/**/*.test.tsx'],
      browser: {
        enabled: true,
        headless: true,
        provider: 'playwright',
        instances: [
          {
            browser: 'chromium',
          },
          {
            browser: 'firefox',
          },
          {
            browser: 'webkit',
          },
        ],
        screenshotFailures: false,
      },
    },
  },
  {
    plugins: [
      react({
        babel: {plugins: [['babel-plugin-react-compiler', {target: '18'}]]},
      }),
    ],
    test: {
      name: 'unit',
      exclude: ['node_modules', 'e2e-tests', 'gherkin-tests'],
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
    },
  },
])
