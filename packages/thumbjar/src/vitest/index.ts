import {fileURLToPath} from 'node:url'
import type {TestProjectInlineConfiguration} from 'vitest/config'
import {DEVICE_TEST_TIMEOUT_SECONDS} from '../device/budget.ts'

export {
  DEVICE_TEST_FILE_SECONDS,
  DEVICE_TESTS_PER_FILE,
} from '../device/budget.ts'

declare module 'vitest' {
  export interface ProvidedContext {
    thumbjarPageUrl: string
    thumbjarPageHint: string
  }
}

/** Options of `deviceProject`. */
export type DeviceProjectOptions = {
  /** The project's name, `device` unless given. */
  name?: string
  /** The device test files. */
  include: string[]
  /**
   * A page URL global setup fetches before any test runs, so a run without the page served fails at
   * once instead of in every test.
   */
  pageUrl: string
  /** How to build and serve the page, printed when global setup cannot fetch `pageUrl`. */
  pageHint: string
  /** Where `typeOnDevice` writes its artifacts, relative to the working directory. `out` unless given. */
  outDir?: string
  /** More setup files, run after thumbjar's own. */
  setupFiles?: string[]
}

/**
 * A Vitest project that types on the one attached Android device: Node environment, one file at a
 * time, no Vitest retry (`typeOnDevice` retries its own driver faults once), and a test timeout that
 * covers the driver's worst case.
 *
 * Global setup fails the run before any test when `adb` has no device or `pageUrl` does not answer.
 * A setup file fails a test file in which an adb process outlived SIGKILL or the page threw while the
 * driver typed, or whose `test.fails` test ended on a driver fault or never completed.
 *
 * @example
 * ```ts
 * export default defineConfig({
 *   test: {
 *     projects: [
 *       deviceProject({
 *         include: ['tests/*.test.ts'],
 *         pageUrl: 'http://localhost:8765/editor.html',
 *         pageHint: 'Build it with `pnpm build:page`.',
 *       }),
 *     ],
 *   },
 * })
 * ```
 */
export function deviceProject({
  name = 'device',
  include,
  pageUrl,
  pageHint,
  outDir = 'out',
  setupFiles = [],
}: DeviceProjectOptions): TestProjectInlineConfiguration {
  return {
    test: {
      name,
      environment: 'node',
      include,
      globalSetup: [fileURLToPath(new URL('global-setup.ts', import.meta.url))],
      setupFiles: [
        fileURLToPath(new URL('setup.ts', import.meta.url)),
        ...setupFiles,
      ],
      provide: {thumbjarPageUrl: pageUrl, thumbjarPageHint: pageHint},
      env: {THUMBJAR_OUT_DIR: outDir},
      fileParallelism: false,
      // The driver retries its own faults once. A failed assertion is a result of the page and never reruns.
      retry: 0,
      // A test takes 1 to 2 minutes. The timeout covers the driver's worst case, see `src/device/budget.ts`.
      testTimeout: DEVICE_TEST_TIMEOUT_SECONDS * 1000,
      hookTimeout: 2 * 60_000,
    },
  }
}
