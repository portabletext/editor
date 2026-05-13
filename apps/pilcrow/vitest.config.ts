import react from '@vitejs/plugin-react'
import {playwright} from '@vitest/browser-playwright'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  server: {
    // HMR re-imports a test file during the run when chained file
    // imports are slow, triggering 'Vite unexpectedly reloaded a
    // test' failures in the chromium orchestrator on CI. Disable it -
    // tests aren't watched, the runner doesn't need HMR.
    hmr: false,
  },
  test: {
    projects: [
      {
        plugins: [
          react({
            babel: {plugins: [['babel-plugin-react-compiler', {target: '19'}]]},
          }),
        ],
        test: {
          name: 'browser',
          include: ['tests/**/*.test.tsx'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{browser: 'chromium', retry: 2}],
            screenshotFailures: false,
          },
        },
      },
    ],
  },
})
