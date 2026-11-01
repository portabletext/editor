import {spawnSync} from 'node:child_process'
import {appendFileSync, readFileSync} from 'node:fs'

// `timing.txt` holds one block of lines per emulator run, the retry's after a `RETRY` line. Each block
// opens with `EMULATOR_START`, written just before its run step. A run prints `BOOTED` once its emulator
// is up. Once its last stage has ended, it adds one `CHECKED <verdict>` line in a single write: `skipped`
// when no check was needed, or the verdict of the device check after a failed stage, `device` or `lost`,
// which the check writes itself before it does anything else. A booted run without that line ended before
// a check reached a verdict, by its run step's timeout, the check's own, or an `adb get-state` that proved
// nothing, and nothing proves what happened to its device: the action shuts the emulator down before any
// later step could look.

/** The `adb get-state` read after a failed stage. Its process gets the rest of the script's cap to stop. */
const DEVICE_STATE_MILLISECONDS = 5_000

type RunState = 'never booted' | 'unchecked' | 'lost' | 'reachable'

/**
 * What one `adb get-state` proves about the device, or `undefined` when it proves nothing. Only `device` on
 * stdout is reachable. Only an offline device, as `offline` on stdout or adb's `device offline` error, the
 * answer of a dead emulator, or adb finding no such device is lost. Its stderr also carries daemon start-up
 * lines. A device that is `unauthorized`, in `bootloader` or `recovery`, or in any other state is still
 * there, and an adb that never answered may only be slow, so neither is lost: a retry on a reachable device
 * could turn a real test failure into a passing retry.
 */
export function deviceVerdict(adb: {
  stdout: string
  stderr: string
  timedOut: boolean
}): 'device' | 'lost' | undefined {
  if (adb.timedOut) {
    return undefined
  }
  const state = adb.stdout.trim()
  if (state === 'device') {
    return 'device'
  }
  if (state === 'offline') {
    return 'lost'
  }
  if (
    state === '' &&
    /^error: (device offline|no devices\/emulators found|device '[^']*' not found)$/m.test(
      adb.stderr,
    )
  ) {
    return 'lost'
  }
  return undefined
}

/**
 * Whether to run once more after a failed first run: only when its emulator never booted or adb lost the
 * device after boot, and never after a retry.
 */
export function retryAfter(
  timing: string,
): {retry: false} | {retry: true; line: string} {
  const runs = splitRuns(timing)
  const [first] = runs
  if (runs.length > 1 || first === undefined) {
    return {retry: false}
  }
  const state = runState(first)
  if (state === 'never booted') {
    return {
      retry: true,
      line: 'BOOT_RETRY: the emulator never booted, retrying once on a fresh emulator',
    }
  }
  if (state === 'lost') {
    return {
      retry: true,
      line: 'DEVICE_LOST_RETRY: adb lost the device after boot, retrying once on a fresh emulator',
    }
  }
  return {retry: false}
}

/**
 * The job's result from the last run's step `outcome`. A last run whose emulator never booted or lost its
 * device fails as infrastructure, apart from any test result.
 */
export function runResult(
  timing: string,
  outcome: string,
): {passed: boolean; line: string} {
  const states = splitRuns(timing).map(runState)
  const last = states.at(-1)
  const first = states.length > 1 ? states[0] : undefined

  const retry =
    first === undefined ? '' : `, on the retry after ${retryReason(first)}`

  if (outcome === 'cancelled') {
    return {passed: false, line: `run outcome: cancelled${retry}`}
  }
  if (outcome !== 'success' && last === 'unchecked') {
    return {
      passed: false,
      line: `run outcome: the run ended after boot without a completed device check${retry}, not a test result`,
    }
  }
  if (outcome !== 'success' && (last === 'lost' || last === 'never booted')) {
    return {
      passed: false,
      line: `run outcome: ${infrastructureFailure(last, first)}, infrastructure failure, not a test result`,
    }
  }
  return {
    passed: outcome === 'success',
    line: `run outcome: ${outcome}${retry}`,
  }
}

/** Each run's boot, from its `EMULATOR_START` to its `BOOTED`. */
export function bootSeconds(timing: string): string[] {
  return splitRuns(timing).map((run, index) => {
    const start = /^EMULATOR_START at (\d+)$/m.exec(run)?.[1]
    const booted = /^BOOTED at (\d+)$/m.exec(run)?.[1]
    const seconds =
      start === undefined || booted === undefined
        ? 'never booted'
        : `${Number(booted) - Number(start)}`
    return `BOOT_SECONDS run ${index + 1}: ${seconds}`
  })
}

const [command, file, outcome] = process.argv.slice(2)

if (!import.meta.main) {
  // Imported by its unit test.
} else if (command === 'device-state' && file !== undefined) {
  const adb = spawnSync('adb', ['get-state'], {
    encoding: 'utf8',
    timeout: DEVICE_STATE_MILLISECONDS,
    killSignal: 'SIGKILL',
  })
  const verdict = deviceVerdict({
    stdout: adb.stdout ?? '',
    stderr: adb.stderr ?? '',
    timedOut: adb.error !== undefined,
  })
  if (verdict === undefined) {
    process.exitCode = 1
  } else {
    appendFileSync(
      file,
      `CHECKED ${verdict} at ${Math.floor(Date.now() / 1000)}\n`,
    )
    process.stdout.write(`${verdict}\n`)
  }
} else if (command === 'retry' && file !== undefined) {
  const decision = retryAfter(readFileSync(file, 'utf8'))
  appendFileSync(
    process.env.GITHUB_OUTPUT ?? '/dev/null',
    `retry=${decision.retry ? 'yes' : 'no'}\n`,
  )
  if (decision.retry) {
    report(decision.line)
    appendFileSync(
      file,
      `RETRY\nEMULATOR_START at ${Math.floor(Date.now() / 1000)}\n`,
    )
  }
} else if (command === 'boot-seconds' && file !== undefined) {
  process.stdout.write(
    `${bootSeconds(readFileSync(file, 'utf8')).join('\n')}\n`,
  )
} else if (
  command === 'result' &&
  file !== undefined &&
  outcome !== undefined
) {
  const result = runResult(readFileSync(file, 'utf8'), outcome)
  report(result.line)
  process.exitCode = result.passed ? 0 : 1
} else {
  console.error(
    'usage: node android/scripts/emulator-runs.ts device-state|retry|boot-seconds <timing.txt> | result <timing.txt> <outcome>',
  )
  process.exitCode = 2
}

function splitRuns(timing: string): string[] {
  return timing.split(/^RETRY$/m)
}

function runState(run: string): RunState {
  if (!/^BOOTED /m.test(run)) {
    return 'never booted'
  }
  const verdict = /^CHECKED (\w+) at \d+$/m.exec(run)?.[1]
  if (verdict === undefined) {
    return 'unchecked'
  }
  return verdict === 'lost' ? 'lost' : 'reachable'
}

function retryReason(state: RunState): string {
  return state === 'never booted'
    ? 'the emulator never booted'
    : 'adb lost the device'
}

function infrastructureFailure(
  last: 'lost' | 'never booted',
  first: RunState | undefined,
) {
  const failure = last === 'lost' ? 'device lost' : 'the emulator never booted'
  if (first === undefined) {
    return failure
  }
  return first === last
    ? `${failure} twice`
    : `${failure} on the retry after ${retryReason(first)}`
}

function report(line: string) {
  process.stdout.write(`${line}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`)
  }
}
