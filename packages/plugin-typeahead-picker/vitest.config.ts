import react from '@vitejs/plugin-react'
import {playwright} from '@vitest/browser-playwright'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        // Resolves the monorepo-only `@portabletext/editor/test*` specifiers
        // through this package's tsconfig `paths`.
        resolve: {tsconfigPaths: true},
        plugins: [react({compiler: {target: '19'}})],
        test: {
          name: 'browser',
          include: ['src/**/*.test.tsx'],
          exclude: ['src/**/*.regression.test.tsx'],
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
        // Resolves the monorepo-only `@portabletext/editor/test*` specifiers
        // through this package's tsconfig `paths`.
        resolve: {tsconfigPaths: true},
        plugins: [react()],
        test: {
          name: 'browser-no-compiler',
          include: ['src/**/*.regression.test.tsx'],
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
        test: {
          name: 'unit',
          include: ['src/**/*.test-d.ts'],
          typecheck: {
            enabled: true,
            include: ['src/**/*.test-d.ts'],
          },
        },
      },
    ],
  },
})
