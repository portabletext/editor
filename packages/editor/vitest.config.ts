import react from '@vitejs/plugin-react'
import {playwright} from '@vitest/browser-playwright'
import {defineConfig} from 'vitest/config'
import {COMPILED_SOURCES} from './react-compiler-sources.ts'

/**
 * Resolves the monorepo-only `@portabletext/editor/test*` specifiers through
 * this package's tsconfig `paths`. Projects are separate Vite configs, so this
 * cannot live at the top level.
 */
const resolve = {tsconfigPaths: true}

/**
 * `COMPILED_SOURCES` drives the published build; test-only harnesses that
 * never ship are added here instead of there.
 */
const TEST_COMPILED_SOURCES = [
  ...COMPILED_SOURCES,
  '/packages/editor/tests/',
  '/packages/editor/gherkin-tests/',
  '/packages/editor/vitest.setup.ts',
]

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: ['html', 'json', 'json-summary'],
      include: ['src/**'],
      exclude: ['src/**/LICENSE'],
      reportOnFailure: true,
      clean: true,
    },
    projects: [
      {
        plugins: [
          react({compiler: {target: '19', sources: TEST_COMPILED_SOURCES}}),
        ],
        resolve,
        test: {
          name: 'browser',
          setupFiles: ['./vitest.setup.ts'],
          include: [
            'gherkin-tests/**/*.test.ts',
            'gherkin-tests/**/*.test.tsx',
            'tests/**/*.test.ts',
            'tests/**/*.test.tsx',
            'src/editor/*.test.ts',
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
          react({compiler: {target: '19', sources: TEST_COMPILED_SOURCES}}),
        ],
        resolve,
        test: {
          name: 'unit',
          exclude: [
            'node_modules',
            'gherkin-tests',
            'tests',
            'src/editor/*.test.ts',
            'src/plugins/*.test.tsx',
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
