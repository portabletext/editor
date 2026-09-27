import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {tsconfigPaths: true},
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'e2e',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          // Each test starts a real browser through the Racetrack CLI.
          testTimeout: 120_000,
        },
      },
    ],
  },
})
