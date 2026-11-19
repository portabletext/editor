import {createRequire} from 'node:module'
import type {TestProject} from 'vitest/node'
import {adb} from '../device/adb.ts'
import {
  GLOBAL_SETUP_ADB_SECONDS,
  GLOBAL_SETUP_PAGE_SECONDS,
} from '../device/budget.ts'

/**
 * Fail before any test when there is no device to type on or no page to open.
 *
 * @public
 */
export default async function setup(
  project: Pick<TestProject, 'getProvidedContext'>,
): Promise<void> {
  const {
    thumbjarPageUrl: pageUrl,
    thumbjarPageHint: pageHint,
    thumbjarDevice,
  } = project.getProvidedContext()
  if (thumbjarDevice === 'ios') {
    try {
      createRequire(import.meta.url).resolve('webdriverio')
      const response = await fetch('http://127.0.0.1:4723/status', {
        signal: AbortSignal.timeout(GLOBAL_SETUP_PAGE_SECONDS * 1000),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch {
      throw new Error(
        'iOS needs the optional `webdriverio` peer dependency and an Appium XCUITest server on port 4723, see the thumbjar README.',
      )
    }
  } else {
    const state = await adb(['get-state'], GLOBAL_SETUP_ADB_SECONDS).then(
      (stdout) => stdout.trim(),
      (error: NodeJS.ErrnoException) =>
        error.code === 'ENOENT' ? 'adb is not on PATH' : error.message.trim(),
    )
    if (state !== 'device') {
      throw new Error(
        `No Android device to type on (${state}). Boot an API 36 Play Store emulator and run \`thumbjar prepare\`, see the thumbjar README.`,
      )
    }
  }
  const page = await fetch(pageUrl, {
    signal: AbortSignal.timeout(GLOBAL_SETUP_PAGE_SECONDS * 1000),
  }).then(
    (response) => `HTTP ${response.status}`,
    (error: Error) => error.message,
  )
  if (page !== 'HTTP 200') {
    throw new Error(`No test page at ${pageUrl} (${page}). ${pageHint}`)
  }
}
