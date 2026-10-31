import {execFile} from 'node:child_process'
import {promisify} from 'node:util'

/** Fail before any test when there is no device to type on or no page to open. */
export default async function setup(): Promise<void> {
  const state = await promisify(execFile)('adb', ['get-state'], {
    timeout: 30_000,
  }).then(
    ({stdout}) => stdout.trim(),
    (error: NodeJS.ErrnoException) =>
      error.code === 'ENOENT' ? 'adb is not on PATH' : error.message.trim(),
  )
  if (state !== 'device') {
    throw new Error(
      `No Android device to type on (${state}). Boot an API 36 Play Store emulator and run \`scripts/run-on-device.sh\`, see the README.`,
    )
  }
  const page = await fetch('http://localhost:8765/editor.html', {
    signal: AbortSignal.timeout(5_000),
  }).then(
    (response) => `HTTP ${response.status}`,
    (error: Error) => error.message,
  )
  if (page !== 'HTTP 200') {
    throw new Error(
      `No test page at http://localhost:8765/editor.html (${page}). Build it with \`pnpm --filter android-ime build:page\` and serve it with \`scripts/run-on-device.sh\`, see the README.`,
    )
  }
}
