import {adb} from '../scripts/lib/adb.ts'
import {
  GLOBAL_SETUP_ADB_SECONDS,
  GLOBAL_SETUP_PAGE_SECONDS,
} from '../scripts/lib/budget.ts'

/** Fail before any test when there is no device to type on or no page to open. */
export default async function setup(): Promise<void> {
  const state = await adb(['get-state'], GLOBAL_SETUP_ADB_SECONDS).then(
    (stdout) => stdout.trim(),
    (error: NodeJS.ErrnoException) =>
      error.code === 'ENOENT' ? 'adb is not on PATH' : error.message.trim(),
  )
  if (state !== 'device') {
    throw new Error(
      `No Android device to type on (${state}). Boot an API 36 Play Store emulator and run \`scripts/run-on-device.sh\`, see the README.`,
    )
  }
  const page = await fetch('http://localhost:8765/editor.html', {
    signal: AbortSignal.timeout(GLOBAL_SETUP_PAGE_SECONDS * 1000),
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
