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
          include: ['tests/**/*.test.tsx'],
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
          exclude: ['node_modules', 'tests'],
          // `*.test-d.ts` files here are type-only (`declare const`
          // fixtures that are never assigned a runtime value): excluded
          // from the executable glob so vitest only typechecks them,
          // never runs them as JS.
          typecheck: {
            enabled: true,
            include: ['src/**/*.test-d.ts'],
          },
        },
      },
    ],
  },
})
