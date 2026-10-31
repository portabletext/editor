import {defineConfig} from 'vitest/config'
import {DEVICE_TEST_TIMEOUT_SECONDS} from './scripts/lib/budget.ts'

export default defineConfig({
  test: {
    reporters:
      process.env.GITHUB_ACTIONS === 'true'
        ? ['default', 'github-actions']
        : ['default'],
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['scripts/**/*.test.ts'],
        },
      },
      {
        // Types on the one attached emulator. `scripts/run-on-device.sh` prepares the device and runs this
        // project, never `test:unit`.
        test: {
          name: 'device',
          environment: 'node',
          include: ['tests/*.test.ts'],
          globalSetup: ['tests/global-setup.ts'],
          setupFiles: ['tests/setup.ts'],
          fileParallelism: false,
          // The driver retries its own faults once. A failed assertion is an editor result and never reruns.
          retry: 0,
          // A test takes 1 to 2 minutes. The timeout covers the driver's worst case, see `scripts/lib/budget.ts`.
          testTimeout: DEVICE_TEST_TIMEOUT_SECONDS * 1000,
          hookTimeout: 2 * 60_000,
        },
      },
    ],
  },
})
