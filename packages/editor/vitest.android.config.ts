import {fileURLToPath} from 'node:url'
import {deviceProject} from 'thumbjar/vitest'
import {defineConfig} from 'vitest/config'

/**
 * The Android device tests, kept out of `vitest.config.ts` so `vitest --run`
 * never needs an emulator. `android/run-on-device.sh` prepares the device and
 * runs the `device` project.
 */
export default defineConfig({
  root: fileURLToPath(new URL('android', import.meta.url)),
  test: {
    reporters:
      process.env.GITHUB_ACTIONS === 'true'
        ? ['default', 'github-actions']
        : ['default'],
    projects: [
      {
        test: {
          name: 'android-unit',
          environment: 'node',
          include: ['scripts/**/*.test.ts'],
        },
      },
      deviceProject({
        include: ['tests/*.test.ts'],
        outDir: fileURLToPath(new URL('android/out', import.meta.url)),
        pageUrl: 'http://localhost:8765/editor.html',
        pageHint:
          'Build it with `pnpm --filter @portabletext/editor build:android` and serve it with `android/run-on-device.sh`, see `android/README.md`.',
      }),
    ],
  },
})
