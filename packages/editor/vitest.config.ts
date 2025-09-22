import react from '@vitejs/plugin-react'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: ['html', 'json', 'json-summary'],
      include: ['src/**'],
      reportOnFailure: true,
      clean: true,
    },
    projects: [
      {
        plugins: [
          react({
            babel: {plugins: [['babel-plugin-react-compiler', {target: '18'}]]},
          }),
        ],
        test: {
          name: 'browser.bak',
          include: [
            'gherkin-tests/**/*.test.ts',
            'gherkin-tests/**/*.test.tsx',
          ],
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
          name: 'browser',
          include: [
            'gherkin-tests-v2/**/*.test.ts',
            'gherkin-tests-v2/**/*.test.tsx',
            'tests/**/*.test.ts',
            'tests/**/*.test.tsx',
            'src/internal-utils/slate-utils.test.tsx',
            'src/plugins/*.test.tsx',
          ],
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
                retry: 3,
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
          exclude: [
            'node_modules',
            'e2e-tests',
            'gherkin-tests',
            'gherkin-tests-v2',
            'tests',
            'src/plugins/*.test.tsx',
            'src/internal-utils/slate-utils.test.tsx',
          ],
          environment: 'jsdom',
        },
      },
    ],
  },
})
