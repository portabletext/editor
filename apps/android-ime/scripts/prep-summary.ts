import {readFileSync} from 'node:fs'
import {
  DEVICE_ANSWERED_NOTE,
  deviceTestNames,
  summaryLine,
} from './lib/summary.ts'

// Usage: node scripts/prep-summary.ts <test file> <adb error|offline|answered> <reason> [state]
// The file's summary line when the prep failed, so the summary still accounts for every test of the job. No
// test ran. Each counts as device offline when the prep's output shows adb's error for a lost device
// (`adb error`) or the one `adb get-state` after the failure did not answer `device` (`offline`, with what it
// gave as `state`). Otherwise (`answered`) the line names the prep's failure, `reason`.

const [file, kind, reason, state] = process.argv.slice(2)
if (
  !file ||
  !reason ||
  (kind !== 'adb error' && kind !== 'offline' && kind !== 'answered')
)
  throw new Error(
    'usage: node scripts/prep-summary.ts <test file> <adb error|offline|answered> <reason> [state]',
  )
const names = deviceTestNames(readFileSync(file, 'utf8'))
if (names.length === 0) throw new Error(`no tests in ${file}`)
const offline = summaryLine(
  file,
  names.map((name) => ({name, outcome: 'device offline'})),
)
console.log(
  kind === 'adb error'
    ? `${offline}, the prep failed on an adb transport error before any test ran`
    : kind === 'offline'
      ? `${offline}, the prep failed before any test ran: ${reason}, and \`adb get-state\` after it gave: ${state}`
      : `\`${file}\`: ${names.length} did not run (${names.map((name) => `"${name}"`).join(', ')}), the prep failed before any test ran: ${reason}\n\n${DEVICE_ANSWERED_NOTE}`,
)
