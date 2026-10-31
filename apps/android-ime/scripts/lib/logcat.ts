// Gboard's input restarts in the device's `main` log buffer, for the Space that commits a word in a call
// with an English `crash`, see `scripts/lib/space.ts`. A restart resets Gboard's suggestion strip, so a
// strip that switched across one says nothing about the Space.
//
// Nothing is sent to the device between a call's inputs for this. Once the page's final read returned, the
// driver reads the device's clock and then `main` once, and places each Space's window, from the start of
// the dump before its tap to the end of the dump after it, timed on the host, on the device's clock. An
// offset sampled after the window cannot show where the window sat on a clock that moved before the
// sample, so a restart this finds or misses only explains a Space the page lacks.

import {adb, adbExit, unstoppedProcesses} from './adb.ts'
import {
  SPACE_CLOCK_READ_SECONDS,
  SPACE_CLOCK_SECONDS,
  SPACE_LEAD_SECONDS,
  SPACE_LOGCAT_READ_SECONDS,
  SPACE_LOGCAT_SECONDS,
  SPACE_PAD_SECONDS,
} from './budget.ts'
import {errorRepr, sleep, withDeadline} from './util.ts'

const RESTART = 'GoogleInputMethodService.onStartInput('

const CLOCK_SAMPLES = 3

/** The device's clock minus the host's, in seconds, and the round trip of the sample it comes from. */
export type ClockOffset = {offset: number; roundTrip: number}

/** Whether Gboard restarted its input in a window, with the line that shows it, or why that is unknown. */
export type InputRestart = {restarted: false} | {restarted: true; line: string} | {restarted: 'unread'; reason: string}

/** The one read of `main`: its `-T` argument, adb's exit status or why it has none, and its output. */
export type LogcatRead = {since: string; status: number | null | string; output: string}

/**
 * Read the device's clock `CLOCK_SAMPLES` times with `adb shell date`, place each at the midpoint of its
 * round trip on the host and keep the one of the shortest round trip. Never throws: a failed sample, a
 * round trip longer than `SPACE_PAD_SECONDS` or a read that ran out of time gives the reason.
 */
export async function readClockOffset(): Promise<ClockOffset | {unread: string}> {
  if (unstoppedProcesses().length > 0) return {unread: 'not read next to a process that outlived SIGKILL'}
  let samples: ClockOffset[]
  try {
    samples = await withDeadline('reading the device clock', SPACE_CLOCK_READ_SECONDS, async () => {
      const read: ClockOffset[] = []
      for (let sample = 0; sample < CLOCK_SAMPLES; sample++) {
        const sent = Date.now()
        const output = (await adb(['shell', 'date +%s.%N'], SPACE_CLOCK_SECONDS)).trim()
        const received = Date.now()
        if (!/^\d+\.\d+$/.test(output)) throw new Error(`adb shell date +%s.%N printed ${JSON.stringify(output)}`)
        read.push({offset: Number(output) - (sent + received) / 2000, roundTrip: (received - sent) / 1000})
      }
      return read
    })
  } catch (error) {
    return {unread: `the read of the device clock failed: ${errorRepr(error)}`}
  }
  const best = samples.reduce((shortest, sample) => (sample.roundTrip < shortest.roundTrip ? sample : shortest))
  if (best.roundTrip > SPACE_PAD_SECONDS)
    return {unread: `the device clock's shortest round trip took ${best.roundTrip.toFixed(3)}s, longer than the ${SPACE_PAD_SECONDS}s pad`}
  return best
}

/**
 * Read `main` once from `since`, the device's time as `adb logcat -T` takes it, no sooner than twice
 * `SPACE_PAD_SECONDS` after `windowsEnd`, a host time in milliseconds. Never throws: a read that fails or runs
 * out of time gives its error as the status and no output.
 */
export async function readLogcat(since: string, windowsEnd: number): Promise<LogcatRead> {
  if (unstoppedProcesses().length > 0) return {since, status: 'not read next to a process that outlived SIGKILL', output: ''}
  try {
    const exit = await withDeadline('reading logcat', SPACE_LOGCAT_READ_SECONDS, async () => {
      await sleep(Math.max(0, windowsEnd / 1000 + 2 * SPACE_PAD_SECONDS - Date.now() / 1000))
      return adbExit(['logcat', '-d', '-v', 'epoch', '-b', 'main', '-T', since], SPACE_LOGCAT_SECONDS)
    })
    return {since, status: exit.code, output: exit.code === 0 ? exit.stdout : `${exit.stdout}${exit.stderr}`}
  } catch (error) {
    return {since, status: errorRepr(error), output: ''}
  }
}

/** `-T` for a read from `SPACE_PAD_SECONDS` and `SPACE_LEAD_SECONDS` before `firstTap`, a host time in milliseconds. */
export function logcatSince(firstTap: number, clock: ClockOffset): string {
  return (firstTap / 1000 + clock.offset - SPACE_PAD_SECONDS - SPACE_LEAD_SECONDS).toFixed(3)
}

/**
 * Whether `read` shows an input restart in the window from `from` to `to`, device times in seconds, widened
 * by `SPACE_PAD_SECONDS` on both sides. A read that failed, or whose first timed line is not older than the
 * widened window or whose last is not newer, may lack lines of it, so it is unread.
 */
export function inputRestartIn(read: LogcatRead, from: number, to: number): InputRestart {
  if (read.status !== 0)
    return {
      restarted: 'unread',
      reason: `the read of logcat failed: adb logcat -d -v epoch -b main -T ${read.since} ${typeof read.status === 'number' ? `exited with ${read.status}: ${read.output.trim()}` : read.status}`,
    }
  const start = from - SPACE_PAD_SECONDS
  const end = to + SPACE_PAD_SECONDS
  const timed = read.output
    .split(/\r?\n/)
    .map((line) => ({line, time: Number(/^\s*(\d+\.\d+)\s/.exec(line)?.[1] ?? Number.NaN)}))
    .filter(({time}) => !Number.isNaN(time))
  const first = timed.at(0)
  const last = timed.at(-1)
  if (first === undefined || last === undefined) return {restarted: 'unread', reason: 'logcat holds no timed line'}
  if (first.time >= start)
    return {restarted: 'unread', reason: `logcat's first line, at ${first.time.toFixed(3)}, is not older than the padded window's start at ${start.toFixed(3)}`}
  if (last.time <= end)
    return {restarted: 'unread', reason: `logcat's last line, at ${last.time.toFixed(3)}, is not newer than the padded window's end at ${end.toFixed(3)}`}
  const restart = timed.find(({line, time}) => time >= start && time <= end && line.includes(RESTART))
  return restart === undefined ? {restarted: false} : {restarted: true, line: restart.line.trim()}
}
