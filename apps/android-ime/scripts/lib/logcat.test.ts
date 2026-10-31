import {readFileSync} from 'node:fs'
import {describe, expect, test} from 'vitest'
import {SPACE_PAD_SECONDS} from './budget.ts'
import {inputRestartIn, logcatSince} from './logcat.ts'

// `main` from the Space probe: around a Space the page got, run 41255435645, and around a tap above the
// keyboard that closed it, run 41254392596, with its input restart at 1793490993.313. Each read here holds
// one of their real lines `SPACE_PAD_SECONDS` plus 2 seconds before and after the window, so only the line
// a test moves decides whether the read covers the padded window.
const quiet = lines('en-space-logcat.txt').filter((line) => !line.includes('ime-driver'))
const RESTART_LINE = lines('en-input-restart-logcat.txt').find((line) => line.includes('GoogleInputMethodService.onStartInput('))!
const RESTART = 1793490993.313
const FROM = 1793490993.0
const TO = 1793490993.6
const EDGE = SPACE_PAD_SECONDS + 2

describe(inputRestartIn.name, () => {
  test('finds no input restart in a window the read covers with the pad on both sides', () => {
    expect(inputRestartIn(read([at(FROM - EDGE, quiet[0]!), at(FROM + 0.1, quiet[1]!), at(TO + EDGE, quiet[2]!)]), FROM, TO)).toEqual({restarted: false})
  })

  test('names the `onStartInput` line in the window around the tap that closed the keyboard', () => {
    expect(inputRestartIn(read([at(FROM - EDGE, quiet[0]!), RESTART_LINE, at(TO + EDGE, quiet[2]!)]), FROM, TO)).toEqual({
      restarted: true,
      line: RESTART_LINE.trim(),
    })
  })

  test('counts a restart inside the pad before the window', () => {
    expect(inputRestartIn(read([at(FROM - EDGE, quiet[0]!), RESTART_LINE, at(TO + EDGE, quiet[2]!)]), RESTART + SPACE_PAD_SECONDS - 0.001, TO)).toEqual({
      restarted: true,
      line: RESTART_LINE.trim(),
    })
  })

  test('counts a restart inside the pad after the window', () => {
    expect(inputRestartIn(read([at(FROM - EDGE, quiet[0]!), RESTART_LINE, at(TO + EDGE, quiet[2]!)]), FROM - 1, RESTART - SPACE_PAD_SECONDS + 0.001)).toEqual({
      restarted: true,
      line: RESTART_LINE.trim(),
    })
  })

  test('counts no restart outside the pad before the window', () => {
    expect(inputRestartIn(read([at(FROM - EDGE, quiet[0]!), RESTART_LINE, at(TO + EDGE, quiet[2]!)]), RESTART + SPACE_PAD_SECONDS + 0.001, TO)).toEqual({
      restarted: false,
    })
  })

  test('counts no restart outside the pad after the window', () => {
    expect(inputRestartIn(read([at(FROM - EDGE, quiet[0]!), RESTART_LINE, at(TO + EDGE, quiet[2]!)]), FROM - 1, RESTART - SPACE_PAD_SECONDS - 0.001)).toEqual({
      restarted: false,
    })
  })

  test('leaves a read whose first line is not older than the padded window unread, a truncated head, though a restart is in the window', () => {
    expect(inputRestartIn(read([at(FROM - SPACE_PAD_SECONDS, quiet[0]!), RESTART_LINE, at(TO + EDGE, quiet[2]!)]), FROM, TO)).toEqual({
      restarted: 'unread',
      reason: "logcat's first line, at 1793490992.000, is not older than the padded window's start at 1793490992.000",
    })
  })

  test('leaves a read whose last line is not newer than the padded window unread, a truncated tail', () => {
    expect(inputRestartIn(read([at(FROM - EDGE, quiet[0]!), at(FROM + 0.1, quiet[1]!), at(TO + SPACE_PAD_SECONDS, quiet[2]!)]), FROM, TO)).toEqual({
      restarted: 'unread',
      reason: "logcat's last line, at 1793490994.600, is not newer than the padded window's end at 1793490994.600",
    })
  })

  test('leaves a read whose last line falls inside the pad after the window unread, though no restart is in it', () => {
    expect(inputRestartIn(read([at(FROM - EDGE, quiet[0]!), at(TO + 0.5, quiet[2]!)]), FROM, TO)).toEqual({
      restarted: 'unread',
      reason: "logcat's last line, at 1793490994.100, is not newer than the padded window's end at 1793490994.600",
    })
  })

  test('leaves a read without a timed line unread', () => {
    expect(inputRestartIn(read(['--------- beginning of main']), FROM, TO)).toEqual({restarted: 'unread', reason: 'logcat holds no timed line'})
  })

  test('leaves a read adb failed unread, naming the command, its status and what it printed', () => {
    expect(inputRestartIn({since: '1793490987.000', status: 1, output: "logcat: -T '1793490987.000' not in time format.\n"}, FROM, TO)).toEqual({
      restarted: 'unread',
      reason: "the read of logcat failed: adb logcat -d -v epoch -b main -T 1793490987.000 exited with 1: logcat: -T '1793490987.000' not in time format.",
    })
  })

  test('leaves a read that ran out of time unread, naming why', () => {
    expect(inputRestartIn({since: '1793490987.000', status: 'DeadlineError: reading logcat timed out after 9s', output: ''}, FROM, TO)).toEqual({
      restarted: 'unread',
      reason: 'the read of logcat failed: adb logcat -d -v epoch -b main -T 1793490987.000 DeadlineError: reading logcat timed out after 9s',
    })
  })
})

describe(logcatSince.name, () => {
  test('reads from the pad and 5 seconds before the first tap, on the device clock, to the millisecond', () => {
    expect(logcatSince(1_700_000_002_000, {offset: 93_480_000.25, roundTrip: 0.1})).toEqual(`${(1_793_480_002.25 - SPACE_PAD_SECONDS - 5).toFixed(3)}`)
  })
})

function read(output: string[]) {
  return {since: '1793490987.000', status: 0, output: ['--------- beginning of main', ...output, ''].join('\n')}
}

/** `line` logged at `time`. */
function at(time: number, line: string): string {
  return line.replace(/^\d+\.\d+/, time.toFixed(3))
}

function lines(name: string): string[] {
  return readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => /^\d/.test(line))
}
