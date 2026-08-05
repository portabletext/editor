import babel from '@rolldown/plugin-babel'
import react, {reactCompilerPreset} from '@vitejs/plugin-react'
import {playwright} from '@vitest/browser-playwright'
import {defaultClientConditions} from 'vite'
import {defineConfig} from 'vitest/config'

/**
 * Resolves this package's own `@portabletext/editor/*` specifiers through the
 * `source` condition in `exports`, so tests run against `src` instead of `lib`,
 * which is not built yet when the test tasks run. Projects are separate Vite
 * configs, so this cannot live at the top level.
 */
const resolve = {conditions: ['source', ...defaultClientConditions]}

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
          react(),
          babel({presets: [reactCompilerPreset({target: '19'})]}),
        ],
        resolve,
        test: {
          name: 'browser',
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
          react(),
          babel({presets: [reactCompilerPreset({target: '19'})]}),
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
