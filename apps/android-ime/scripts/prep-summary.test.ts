import {execFileSync} from 'node:child_process'
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {afterEach, beforeEach, describe, expect, test} from 'vitest'

const app = fileURLToPath(new URL('..', import.meta.url))

let directory: string

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'android-ime-prep-'))
  for (const path of ['scripts', 'tests', 'package.json'])
    cpSync(join(app, path), join(directory, path), {recursive: true})
  mkdirSync(join(directory, 'dist'))
  mkdirSync(join(directory, 'bin'))
})

afterEach(() => {
  rmSync(directory, {recursive: true, force: true})
})

/**
 * Run `run-on-device.sh` on `file` against a fake `adb` that answers the boot capture's first two reads, runs
 * `getState` for `adb get-state` and `failure` for every other call, so the prep fails on its boot capture.
 */
function runPrep(file: string, failure: string, getState: string) {
  writeFileSync(
    join(directory, 'bin', 'adb'),
    `#!/bin/sh\ncase "$*" in\n  "shell cat /proc/sys/kernel/random/boot_id") echo boot ;;\n  "shell echo"*) echo 100 1.0 ;;\n  get-state) ${getState} ;;\n  *) ${failure} ;;\nesac\n`,
  )
  chmodSync(join(directory, 'bin', 'adb'), 0o755)
  const summary = join(directory, 'step-summary.md')
  rmSync(summary, {force: true})
  rmSync(join(directory, 'out'), {recursive: true, force: true})
  let status = 0
  try {
    execFileSync('bash', ['scripts/run-on-device.sh', file], {
      cwd: directory,
      env: {
        ...process.env,
        PATH: `${join(directory, 'bin')}:${process.env.PATH}`,
        IME_LANG: 'en',
        GITHUB_STEP_SUMMARY: summary,
      },
      stdio: 'pipe',
    })
  } catch (error) {
    status = (error as {status: number}).status
  }
  const phases = readFileSync(join(directory, 'out', 'phases.log'), 'utf8')
    .split('\n')
    .map((line) => line.replace(/^PHASE \S+ /, ''))
  return {
    status,
    prepFailed: phases.filter((line) => line.includes('PREP FAILED')),
    getState: phases.filter((line) => line.includes('adb get-state')),
    stepSummary: existsSync(summary) ? readFileSync(summary, 'utf8') : null,
  }
}

const EN_TESTS =
  '"Scenario: Typing kyou twice into a plain contenteditable", "Scenario: Typing kyou twice into an empty block", "Scenario: Typing kyou twice after existing text"'

describe('a failed prep', () => {
  test('writes a summary line that counts each test of the file as device offline when its output shows adb lost the device, whatever `adb get-state` says after it', () => {
    expect(
      runPrep(
        'tests/en.test.ts',
        'echo "adb: device offline" >&2; exit 1',
        'echo device',
      ),
    ).toEqual({
      status: 1,
      prepFailed: ['PREP FAILED: boot capture'],
      getState: ['adb get-state after the failed prep: rc=0 device'],
      stepSummary: `\`tests/en.test.ts\`: 0 passed, 0 failed, 0 expected crash reproduced, 0 expected failure, 0 inconclusive, 3 device offline (${EN_TESTS}), 0 driver fault, the prep failed on an adb transport error before any test ran\n`,
    })
  }, 60_000)

  test('writes a line naming the prep failure, with the note that a device that came back is not counted, when the prep failed on something else and `adb get-state` says `device`', () => {
    expect(
      runPrep(
        'tests/en.test.ts',
        'echo "logcat: Unable to open log device" >&2; exit 1',
        'echo device',
      ),
    ).toEqual({
      status: 1,
      prepFailed: ['PREP FAILED: boot capture'],
      getState: ['adb get-state after the failed prep: rc=0 device'],
      stepSummary: `\`tests/en.test.ts\`: 3 did not run (${EN_TESTS}), the prep failed before any test ran: boot capture\n\nNot counted as device offline: adb could still reach the device right after the failure. A device that dropped off and came back before that check is missed, so the device offline count can be too low.\n`,
    })
  }, 60_000)

  test('writes the line naming the prep failure, with the note, when `adb get-state` says `device` on stdout and adb starts its server on stderr', () => {
    expect(
      runPrep(
        'tests/en.test.ts',
        'echo "logcat: Unable to open log device" >&2; exit 1',
        'echo "* daemon not running; starting now at tcp:5037" >&2; echo "* daemon started successfully" >&2; echo device',
      ),
    ).toEqual({
      status: 1,
      prepFailed: ['PREP FAILED: boot capture'],
      getState: [
        'adb get-state after the failed prep: rc=0 device',
        'adb get-state stderr after the failed prep: * daemon not running; starting now at tcp:5037 * daemon started successfully',
      ],
      stepSummary: `\`tests/en.test.ts\`: 3 did not run (${EN_TESTS}), the prep failed before any test ran: boot capture\n\nNot counted as device offline: adb could still reach the device right after the failure. A device that dropped off and came back before that check is missed, so the device offline count can be too low.\n`,
    })
  }, 60_000)

  test('counts each test as device offline when a stage ran out of time with no adb error in its output and `adb get-state` then fails', () => {
    expect(
      runPrep(
        'tests/en.test.ts',
        'exec sleep 16',
        'echo "error: no devices/emulators found" >&2; exit 1',
      ),
    ).toEqual({
      status: 1,
      prepFailed: ['PREP FAILED: capture_seed ran past 15s'],
      getState: [
        'adb get-state after the failed prep: rc=1 error: no devices/emulators found',
      ],
      stepSummary: `\`tests/en.test.ts\`: 0 passed, 0 failed, 0 expected crash reproduced, 0 expected failure, 0 inconclusive, 3 device offline (${EN_TESTS}), 0 driver fault, the prep failed before any test ran: capture_seed ran past 15s, and \`adb get-state\` after it gave: error: no devices/emulators found\n`,
    })
  }, 60_000)

  test('names the stage that ran out of time, not device offline, when `adb get-state` then says `device`', () => {
    const run = runPrep('tests/en.test.ts', 'exec sleep 16', 'echo device')
    expect({
      ...run,
      namesStateDevice: String(run.stepSummary).includes('(adb: device)'),
    }).toEqual({
      status: 1,
      prepFailed: ['PREP FAILED: capture_seed ran past 15s'],
      getState: ['adb get-state after the failed prep: rc=0 device'],
      stepSummary: `\`tests/en.test.ts\`: 3 did not run (${EN_TESTS}), the prep failed before any test ran: capture_seed ran past 15s\n\nNot counted as device offline: adb could still reach the device right after the failure. A device that dropped off and came back before that check is missed, so the device offline count can be too low.\n`,
      namesStateDevice: false,
    })
  }, 60_000)

  test('counts each test as device offline when `adb get-state` runs past its 5 seconds or names another state', () => {
    expect(
      ['exec sleep 10', 'echo offline'].map((getState) =>
        runPrep(
          'tests/en.test.ts',
          'echo "logcat: Unable to open log device" >&2; exit 1',
          getState,
        ),
      ),
    ).toEqual([
      {
        status: 1,
        prepFailed: ['PREP FAILED: boot capture'],
        getState: ['adb get-state after the failed prep: rc=124 ran past 5s'],
        stepSummary: `\`tests/en.test.ts\`: 0 passed, 0 failed, 0 expected crash reproduced, 0 expected failure, 0 inconclusive, 3 device offline (${EN_TESTS}), 0 driver fault, the prep failed before any test ran: boot capture, and \`adb get-state\` after it gave: ran past 5s\n`,
      },
      {
        status: 1,
        prepFailed: ['PREP FAILED: boot capture'],
        getState: ['adb get-state after the failed prep: rc=0 offline'],
        stepSummary: `\`tests/en.test.ts\`: 0 passed, 0 failed, 0 expected crash reproduced, 0 expected failure, 0 inconclusive, 3 device offline (${EN_TESTS}), 0 driver fault, the prep failed before any test ran: boot capture, and \`adb get-state\` after it gave: offline\n`,
      },
    ])
  }, 60_000)

  test('writes the line for each adb error that means adb lost the device', () => {
    expect(
      ['error: closed', 'adb: no devices/emulators found'].map(
        (stderr) =>
          runPrep(
            'tests/ja.test.ts',
            `echo "${stderr}" >&2; exit 1`,
            'echo device',
          ).stepSummary,
      ),
    ).toEqual([
      `\`tests/ja.test.ts\`: 0 passed, 0 failed, 0 expected crash reproduced, 0 expected failure, 0 inconclusive, 3 device offline (${EN_TESTS}), 0 driver fault, the prep failed on an adb transport error before any test ran\n`,
      `\`tests/ja.test.ts\`: 0 passed, 0 failed, 0 expected crash reproduced, 0 expected failure, 0 inconclusive, 3 device offline (${EN_TESTS}), 0 driver fault, the prep failed on an adb transport error before any test ran\n`,
    ])
  }, 60_000)
})

describe('the dictionary wait that failed', () => {
  // The line `scripts/dictionary.ts wait` prints for run 41281397831's boot, from its capture in
  // `scripts/lib/dictionary.test.ts`.
  const NEVER_LOADED =
    "DICTIONARY FAILED: the Japanese dictionary never loaded: Gboard 15.1.08.726012951-preload-x86_64 logged no `data_loader.cc` `New data is loaded` line for a `mozcdata-<version>.data` file within 360s of boot. It logged `Fallback to minimal engine`, and 2 downloads of `__MOZCPACK_mozcmain_ja_JP` were cancelled. The capture may also lack the line: the main buffer had dropped 2865 of its 9812 lines by the capture's first dump, so the capture may lack lines from boot on, its oldest kept line is from 26.9s after boot, so a load before then would not show. Dictionary lines seen:"

  test("names the wait's own reason in the PREP FAILED line, which leads with the dictionary that never loaded", () => {
    expect(
      dictionaryFailure([
        'DICTIONARY waiting for the load line until 360s after boot, now 60s',
        NEVER_LOADED,
        '1793515060.365  1756  4711 E native  : Fallback to minimal engine.',
      ]),
    ).toEqual(
      `PREP FAILED: japanese dictionary wait: ${NEVER_LOADED.replace('DICTIONARY FAILED: ', '')} See ja-dictionary.log`,
    )
  })

  test('names a capture of another boot as the wait gives it', () => {
    expect(
      dictionaryFailure([
        'DICTIONARY FAILED: the boot capture cannot show whether Gboard loaded its Japanese dictionary: the capture has no CAPTURE header, so nothing ties it to this boot',
      ]),
    ).toEqual(
      'PREP FAILED: japanese dictionary wait: the boot capture cannot show whether Gboard loaded its Japanese dictionary: the capture has no CAPTURE header, so nothing ties it to this boot See ja-dictionary.log',
    )
  })

  test('says the wait gave no reason when it printed none, as when it ran past its cap', () => {
    expect(
      dictionaryFailure(['DICTIONARY still waiting 333s after boot']),
    ).toEqual(
      'PREP FAILED: japanese dictionary wait gave no reason, see ja-dictionary.log',
    )
  })
})

/** The PREP FAILED line `run-on-device.sh` logs for a dictionary wait that printed `lines` to `ja-dictionary.log`. */
function dictionaryFailure(lines: string[]): string {
  const script = readFileSync(join(app, 'scripts', 'run-on-device.sh'), 'utf8')
  // `log` and `fail` are one-line functions, `dictionary_failure` a block that ends on a line of its own.
  const functions = [
    /^log\(\) \{.*\}$/m,
    /^fail\(\) \{.*\}$/m,
    /^dictionary_failure\(\) \{\n[\s\S]*?\n\}$/m,
  ].map((pattern) => pattern.exec(script)?.[0] ?? '')
  mkdirSync(join(directory, 'out'))
  writeFileSync(
    join(directory, 'out', 'ja-dictionary.log'),
    `${lines.join('\n')}\n`,
  )
  try {
    execFileSync(
      'bash',
      ['-c', `out=out\n${functions.join('\n')}\n(dictionary_failure)`],
      {cwd: directory, stdio: 'pipe'},
    )
  } catch {}
  return readFileSync(join(directory, 'out', 'phases.log'), 'utf8')
    .trim()
    .replace(/^PHASE \S+ /, '')
}
