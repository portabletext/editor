import react from '@vitejs/plugin-react'
import {playwright} from '@vitest/browser-playwright'
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
            babel: {plugins: [['babel-plugin-react-compiler', {target: '19'}]]},
            exclude: [
              /\/node_modules\//,
              /\/src\/slate\//,
              /\/src\/slate-dom\//,
              /\/src\/slate-react\//,
            ],
          }),
        ],
        test: {
          name: 'browser',
          include: [
            'gherkin-tests/**/*.test.ts',
            'gherkin-tests/**/*.test.tsx',
            'tests/**/*.test.ts',
            'tests/**/*.test.tsx',
            'src/editor/*.test.ts',
            'src/internal-utils/slate-utils.test.tsx',
            'src/plugins/*.test.tsx',
            'src/history/**/*.test.ts',
            'src/history/**/*.test.tsx',
          ],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
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
            babel: {plugins: [['babel-plugin-react-compiler', {target: '19'}]]},
            exclude: [
              /\/node_modules\//,
              /\/src\/slate\//,
              /\/src\/slate-dom\//,
              /\/src\/slate-react\//,
            ],
          }),
        ],
        test: {
          name: 'unit',
          exclude: [
            'node_modules',
            'gherkin-tests',
            'tests',
            'src/editor/*.test.ts',
            'src/plugins/*.test.tsx',
            'src/internal-utils/slate-utils.test.tsx',
            'src/history',
          ],
          environment: 'jsdom',
          typecheck: {
            enabled: true,
            include: ['src/**/*.test-d.ts'],
          },
        },
      },
    ],
  },
})
