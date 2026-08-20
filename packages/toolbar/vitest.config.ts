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
    ],
  },
})
