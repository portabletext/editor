import {fileURLToPath} from 'node:url'
import type {TestProjectInlineConfiguration} from 'vitest/config'
import {DEVICE_TEST_TIMEOUT_SECONDS} from '../device/budget.ts'

// One iOS test, including the first WebDriverAgent launch; no budget derivation yet.
const IOS_TEST_TIMEOUT_SECONDS = 1200

export {
  countDeviceTests,
  deviceTestFileSeconds,
  EMULATOR_BOOT_SECONDS,
  FETCH_U2_JAR_WORST_SECONDS,
  prepWorstSeconds,
  runStepWorstSeconds,
} from '../device/budget.ts'

declare module 'vitest' {
  /**
   * Page and summary settings supplied by `deviceProject`.
   *
   * @public
   */
  export interface ProvidedContext {
    thumbjarDevice?: 'android' | 'ios'
    thumbjarPageUrl: string
    thumbjarPageHint: string
    thumbjarSummaryFile?: string | undefined
  }
}

/**
 * Options of `deviceProject`.
 *
 * @public
 */
export type DeviceProjectOptions = {
  /** The project's name, `device` unless given. */
  name?: string
  /** The keyboard backend. Defaults to `android`. */
  device?: 'android' | 'ios'
  /** The device test files. */
  include: string[]
  /**
   * A page URL global setup fetches before any test runs, so a run without the page served fails at
   * once instead of in every test.
   */
  pageUrl: string
  /** How to build and serve the page, printed when global setup cannot fetch `pageUrl`. */
  pageHint: string
  /** Where `runOnDevice` writes its artifacts, relative to the working directory. `out` unless given. */
  outDir?: string
  /** A file the setup file appends each test file's outcome counts and a table of its tests to, such as GitHub's job summary. None is written unless given. */
  summaryFile?: string | undefined
  /** More setup files, run after thumbjar's own. */
  setupFiles?: string[]
}

/**
 * A Vitest project that types on one device (`android` by default, or the iOS Simulator): Node environment, one file at a
 * time, no Vitest retry (on Android `runOnDevice` retries eligible driver faults once; on iOS it makes one attempt), and a test timeout that
 * covers the driver's worst case.
 *
 * Global setup fails the run before any test when `pageUrl` does not answer, or on Android when `adb` has no device.
 * The iOS backend uses a local Appium XCUITest server on port 4723 and makes one attempt, without a retry.
 * A setup file fails a test file in which an adb process outlived SIGKILL or the page threw while the
 * driver typed, or whose `test.fails` test ended inconclusive, with the device offline, on a driver fault or
 * never completed. With `summaryFile` given, it appends each test file's outcome counts and a table of its tests to it.
 *
 * @example
 * ```ts
 * import {deviceProject} from 'thumbjar/vitest'
 * import {defineConfig} from 'vitest/config'
 *
 * export default defineConfig({
 *   test: {
 *     projects: [
 *       deviceProject({
 *         include: ['tests/*.test.ts'],
 *         pageUrl: 'http://localhost:8765/editor.html',
 *         pageHint: 'Build and serve the test page first.',
 *       }),
 *     ],
 *   },
 * })
 * ```
 *
 * @public
 */
export function deviceProject({
  name = 'device',
  device = 'android',
  include,
  pageUrl,
  pageHint,
  outDir = 'out',
  summaryFile,
  setupFiles = [],
}: DeviceProjectOptions): TestProjectInlineConfiguration {
  return {
    test: {
      name,
      environment: 'node',
      include,
      globalSetup: [
        fileURLToPath(import.meta.resolve('thumbjar/vitest/global-setup')),
      ],
      setupFiles: [
        fileURLToPath(import.meta.resolve('thumbjar/vitest/setup')),
        ...setupFiles,
      ],
      provide: {
        ...(device === 'ios' ? {thumbjarDevice: device} : {}),
        thumbjarPageUrl: pageUrl,
        thumbjarPageHint: pageHint,
        thumbjarSummaryFile: summaryFile,
      },
      env: {THUMBJAR_OUT_DIR: outDir},
      fileParallelism: false,
      // On Android the driver retries its own faults once; on iOS it makes one attempt. A failed assertion is a result of the page and never reruns.
      retry: 0,
      testTimeout:
        device === 'ios'
          ? IOS_TEST_TIMEOUT_SECONDS * 1000
          : DEVICE_TEST_TIMEOUT_SECONDS * 1000,
      hookTimeout:
        device === 'ios'
          ? IOS_TEST_TIMEOUT_SECONDS * 1000
          : DEVICE_TEST_TIMEOUT_SECONDS * 1000,
    },
  }
}
