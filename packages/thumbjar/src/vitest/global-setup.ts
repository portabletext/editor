import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import type {TestProject} from 'vitest/node'

/** Fail before any test when there is no device to type on or no page to open. */
export default async function setup(project: TestProject): Promise<void> {
  const {thumbjarPageUrl: pageUrl, thumbjarPageHint: pageHint} =
    project.getProvidedContext()
  const state = await promisify(execFile)('adb', ['get-state'], {
    timeout: 30_000,
  }).then(
    ({stdout}) => stdout.trim(),
    (error: NodeJS.ErrnoException) =>
      error.code === 'ENOENT' ? 'adb is not on PATH' : error.message.trim(),
  )
  if (state !== 'device') {
    throw new Error(
      `No Android device to type on (${state}). Boot an API 36 Play Store emulator and run \`thumbjar prepare\`, see the thumbjar README.`,
    )
  }
  const page = await fetch(pageUrl, {
    signal: AbortSignal.timeout(5_000),
  }).then(
    (response) => `HTTP ${response.status}`,
    (error: Error) => error.message,
  )
  if (page !== 'HTTP 200') {
    throw new Error(`No test page at ${pageUrl} (${page}). ${pageHint}`)
  }
}
