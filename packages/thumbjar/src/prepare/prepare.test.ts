import {spawn, spawnSync} from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
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
import {describe, expect, test, vi} from 'vitest'

const prepareScript = fileURLToPath(new URL('prepare.sh', import.meta.url))
const realSleep = spawnSync('bash', ['-c', 'command -v sleep'], {
  encoding: 'utf8',
}).stdout.trim()
// The first line `dictionary.js wait` prints for a real CI boot whose Gboard never loaded the
// dictionary, from its capture in `src/gboard/dictionary.test.ts`.
const NEVER_LOADED =
  "Gboard's Japanese dictionary never loaded on this boot: Gboard 15.1.08.726012951-preload-x86_64 logged no `data_loader.cc` `New data is loaded` line for a `mozcdata-<version>.data` file within 360s of boot. It logged `Fallback to minimal engine`, and 2 downloads of `__MOZCPACK_mozcmain_ja_JP` were cancelled. The capture may also lack the line: the main buffer had dropped 2865 of its 9812 lines by the capture's first dump, so the capture may lack lines from boot on, its oldest kept line is from 26.9s after boot, so a load before then would not show."

// The first line `dictionary.js wait` prints for a capture of an earlier boot.
const CAPTURE_FAULT =
  'the boot capture cannot show whether Gboard loaded its Japanese dictionary: the capture is of boot 5f0c4c2e-9a1b-4c0e-8d3f-2b7a6e1d9c40, the device runs boot 62cd1ade-9b02-4723-ba9e-2749dda3d074'

const SETTLE_AND_DIAGNOSE = [
  'adb logcat -d -b events',
  'adb logcat -d -b events',
  'adb logcat -d -b events',
  'adb logcat -d -b events',
  'adb logcat -d -b events',
  'adb logcat -d -b events',
  'adb shell getprop ro.build.fingerprint',
  'adb shell getprop ro.build.version.sdk',
  'adb shell getprop persist.sys.locale',
  'adb shell settings get system system_locales',
  'adb shell ime list -s',
  'adb shell settings get secure default_input_method',
  'adb shell settings get secure enabled_input_methods',
  'adb shell dumpsys package com.google.android.inputmethod.latin',
  'adb shell dumpsys package com.android.chrome',
  'adb shell dumpsys input_method',
  'adb root',
]
const DEVICE_SETTINGS = [
  'adb shell am set-debug-app --persistent com.android.chrome',
  'adb shell echo "_ --disable-fre --no-default-browser-check --no-first-run --disable-features=SigninPromo" > /data/local/tmp/chrome-command-line',
  'adb shell cat /data/local/tmp/chrome-command-line',
  'adb shell settings put secure show_ime_with_hard_keyboard 1',
  'adb shell settings get secure show_ime_with_hard_keyboard',
]
const SERVE = [
  'adb logcat -c',
  'adb reverse tcp:8765 tcp:8765',
  'adb reverse --list',
]

describe('prepare.sh', () => {
  test('disables Play Store before the settle and logs one line saying the disable succeeded and Play Store is listed as disabled', () => {
    expect(prepare({keyboard: 'en', playStore: 'disabled'})).toEqual({
      status: 0,
      calls: [
        'adb shell settings put global hide_error_dialogs 1',
        'adb shell pm disable-user --user 0 com.android.vending',
        'adb shell pm list packages -d com.android.vending',
        ...SETTLE_AND_DIAGNOSE,
        ...DEVICE_SETTINGS,
        ...SERVE,
      ],
      phases: [
        'self-update block: disabling com.android.vending succeeded, pm list packages -d lists it',
        'settle start',
        'settle done after 0s quiet=30',
        'diagnose start',
        'chrome flags',
        'soft keyboard',
        'logcat',
        'http ok',
      ],
    })
  })

  test('logs a failed disable that leaves Play Store enabled, and goes on with the prep', () => {
    expect(prepare({keyboard: 'en', playStore: 'refused'})).toEqual({
      status: 0,
      calls: [
        'adb shell settings put global hide_error_dialogs 1',
        'adb shell pm disable-user --user 0 com.android.vending',
        'adb shell pm list packages -d com.android.vending',
        ...SETTLE_AND_DIAGNOSE,
        ...DEVICE_SETTINGS,
        ...SERVE,
      ],
      phases: [
        "self-update block: disabling com.android.vending failed (exit 255: Exception occurred while executing 'disable-user': java.lang.SecurityException: Shell cannot change component state for com.android.vending/null to 3), pm list packages -d does not list it",
        'settle start',
        'settle done after 0s quiet=30',
        'diagnose start',
        'chrome flags',
        'soft keyboard',
        'logcat',
        'http ok',
      ],
    })
  })

  test('goes on with the prep when the disable never answers, with one line saying so', () => {
    expect(prepare({keyboard: 'en', playStore: 'hung'})).toEqual({
      status: 0,
      calls: [
        'adb shell settings put global hide_error_dialogs 1',
        'adb shell pm disable-user --user 0 com.android.vending',
        'adb shell pm list packages -d com.android.vending',
        ...SETTLE_AND_DIAGNOSE,
        ...DEVICE_SETTINGS,
        ...SERVE,
      ],
      phases: [
        'self-update block: disabling com.android.vending failed (no answer within 8s), pm list packages -d does not list it',
        'settle start',
        'settle done after 0s quiet=30',
        'diagnose start',
        'chrome flags',
        'soft keyboard',
        'logcat',
        'http ok',
      ],
    })
  }, 30_000)

  test('reads no deadline from the environment, so an inherited THUMBJAR_PREP_DEADLINE leaves the prep as it is', () => {
    expect(
      prepare({
        keyboard: 'en',
        playStore: 'disabled',
        env: {THUMBJAR_PREP_DEADLINE: 'not-a-duration'},
      }),
    ).toEqual({
      status: 0,
      calls: [
        'adb shell settings put global hide_error_dialogs 1',
        'adb shell pm disable-user --user 0 com.android.vending',
        'adb shell pm list packages -d com.android.vending',
        ...SETTLE_AND_DIAGNOSE,
        ...DEVICE_SETTINGS,
        ...SERVE,
      ],
      phases: [
        'self-update block: disabling com.android.vending succeeded, pm list packages -d lists it',
        'settle start',
        'settle done after 0s quiet=30',
        'diagnose start',
        'chrome flags',
        'soft keyboard',
        'logcat',
        'http ok',
      ],
    })
  })

  test('captures the boot before anything else, then waits for the Japanese dictionary from when the emulator came online and checks it on the page after the Japanese setup, before the prep ends', () => {
    expect(prepare({keyboard: 'ja', playStore: 'disabled'})).toEqual({
      status: 0,
      calls: [
        'adb shell cat /proc/sys/kernel/random/boot_id',
        'adb shell echo $(date +%s) $(cat /proc/uptime)',
        'adb logcat -G 16M -b main',
        'adb logcat -d -v epoch -b main',
        'adb logcat -S -b main',
        'adb shell settings put global hide_error_dialogs 1',
        'adb shell pm disable-user --user 0 com.android.vending',
        'adb shell pm list packages -d com.android.vending',
        ...SETTLE_AND_DIAGNOSE,
        ...DEVICE_SETTINGS,
        'node setup-ja.js out',
        'node dictionary.js wait out 1793515010',
        'node dictionary.js check out http://localhost:8765/editor.html',
        ...SERVE,
      ],
      phases: [
        'boot capture',
        'self-update block: disabling com.android.vending succeeded, pm list packages -d lists it',
        'settle start',
        'settle done after 0s quiet=30',
        'diagnose start',
        'chrome flags',
        'soft keyboard',
        'japanese setup',
        'japanese setup rc=0',
        'japanese dictionary wait',
        'japanese dictionary wait rc=0',
        'japanese dictionary check',
        'japanese dictionary check rc=0',
        'logcat',
        'http ok',
      ],
      captureHeader:
        'CAPTURE boot_id=62cd1ade-9b02-4723-ba9e-2749dda3d074 btime=1793514968',
    })
  })

  test('fails the prep with the wait’s own reason, leading with the dictionary that never loaded, exits 3 for it, and neither checks it nor serves the page', () => {
    expect(
      prepare({keyboard: 'ja', playStore: 'disabled', dictionary: 'never'}),
    ).toEqual({
      status: 3,
      calls: [
        'adb shell cat /proc/sys/kernel/random/boot_id',
        'adb shell echo $(date +%s) $(cat /proc/uptime)',
        'adb logcat -G 16M -b main',
        'adb logcat -d -v epoch -b main',
        'adb logcat -S -b main',
        'adb shell settings put global hide_error_dialogs 1',
        'adb shell pm disable-user --user 0 com.android.vending',
        'adb shell pm list packages -d com.android.vending',
        ...SETTLE_AND_DIAGNOSE,
        ...DEVICE_SETTINGS,
        'node setup-ja.js out',
        'node dictionary.js wait out 1793515010',
      ],
      phases: [
        'boot capture',
        'self-update block: disabling com.android.vending succeeded, pm list packages -d lists it',
        'settle start',
        'settle done after 0s quiet=30',
        'diagnose start',
        'chrome flags',
        'soft keyboard',
        'japanese setup',
        'japanese setup rc=0',
        'japanese dictionary wait',
        'japanese dictionary wait rc=3',
        `PREP FAILED: ${NEVER_LOADED} See ja-dictionary.log for the dictionary lines it saw.`,
      ],
      captureHeader:
        'CAPTURE boot_id=62cd1ade-9b02-4723-ba9e-2749dda3d074 btime=1793514968',
    })
  })

  test('fails the prep with exit status 1 when the wait finds a capture that cannot show the load', () => {
    expect(
      prepare({
        keyboard: 'ja',
        playStore: 'disabled',
        dictionary: 'capture fault',
      }),
    ).toEqual({
      status: 1,
      calls: [
        'adb shell cat /proc/sys/kernel/random/boot_id',
        'adb shell echo $(date +%s) $(cat /proc/uptime)',
        'adb logcat -G 16M -b main',
        'adb logcat -d -v epoch -b main',
        'adb logcat -S -b main',
        'adb shell settings put global hide_error_dialogs 1',
        'adb shell pm disable-user --user 0 com.android.vending',
        'adb shell pm list packages -d com.android.vending',
        ...SETTLE_AND_DIAGNOSE,
        ...DEVICE_SETTINGS,
        'node setup-ja.js out',
        'node dictionary.js wait out 1793515010',
      ],
      phases: [
        'boot capture',
        'self-update block: disabling com.android.vending succeeded, pm list packages -d lists it',
        'settle start',
        'settle done after 0s quiet=30',
        'diagnose start',
        'chrome flags',
        'soft keyboard',
        'japanese setup',
        'japanese setup rc=0',
        'japanese dictionary wait',
        'japanese dictionary wait rc=1',
        `PREP FAILED: ${CAPTURE_FAULT} See ja-dictionary.log for the dictionary lines it saw.`,
      ],
      captureHeader:
        'CAPTURE boot_id=62cd1ade-9b02-4723-ba9e-2749dda3d074 btime=1793514968',
    })
  })

  test('fails the prep with exit status 1 when Gboard did not convert after the load', () => {
    expect(
      prepare({
        keyboard: 'ja',
        playStore: 'disabled',
        dictionary: 'check fails',
      }),
    ).toEqual({
      status: 1,
      calls: [
        'adb shell cat /proc/sys/kernel/random/boot_id',
        'adb shell echo $(date +%s) $(cat /proc/uptime)',
        'adb logcat -G 16M -b main',
        'adb logcat -d -v epoch -b main',
        'adb logcat -S -b main',
        'adb shell settings put global hide_error_dialogs 1',
        'adb shell pm disable-user --user 0 com.android.vending',
        'adb shell pm list packages -d com.android.vending',
        ...SETTLE_AND_DIAGNOSE,
        ...DEVICE_SETTINGS,
        'node setup-ja.js out',
        'node dictionary.js wait out 1793515010',
        'node dictionary.js check out http://localhost:8765/editor.html',
      ],
      phases: [
        'boot capture',
        'self-update block: disabling com.android.vending succeeded, pm list packages -d lists it',
        'settle start',
        'settle done after 0s quiet=30',
        'diagnose start',
        'chrome flags',
        'soft keyboard',
        'japanese setup',
        'japanese setup rc=0',
        'japanese dictionary wait',
        'japanese dictionary wait rc=0',
        'japanese dictionary check',
        'japanese dictionary check rc=1',
        'PREP FAILED: japanese dictionary check, see ja-dictionary.log',
      ],
      captureHeader:
        'CAPTURE boot_id=62cd1ade-9b02-4723-ba9e-2749dda3d074 btime=1793514968',
    })
  })

  test('fails the prep with exit status 1 when the Japanese setup failed, even when the setup exited 3', () => {
    expect(
      prepare({keyboard: 'ja', playStore: 'disabled', setup: 'exits 3'}),
    ).toEqual({
      status: 1,
      calls: [
        'adb shell cat /proc/sys/kernel/random/boot_id',
        'adb shell echo $(date +%s) $(cat /proc/uptime)',
        'adb logcat -G 16M -b main',
        'adb logcat -d -v epoch -b main',
        'adb logcat -S -b main',
        'adb shell settings put global hide_error_dialogs 1',
        'adb shell pm disable-user --user 0 com.android.vending',
        'adb shell pm list packages -d com.android.vending',
        ...SETTLE_AND_DIAGNOSE,
        ...DEVICE_SETTINGS,
        'node setup-ja.js out',
      ],
      phases: [
        'boot capture',
        'self-update block: disabling com.android.vending succeeded, pm list packages -d lists it',
        'settle start',
        'settle done after 0s quiet=30',
        'diagnose start',
        'chrome flags',
        'soft keyboard',
        'japanese setup',
        'japanese setup rc=3',
        'PREP FAILED: japanese setup, see ja-setup.log',
      ],
      captureHeader:
        'CAPTURE boot_id=62cd1ade-9b02-4723-ba9e-2749dda3d074 btime=1793514968',
    })
  })
})

describe('prepare.sh exit status', () => {
  test('logs the status of `adb reverse --list`, its last command, and never takes it as the prep’s, so its exit 3 neither fails the prep nor reads as a dictionary that never loaded', () => {
    expect([
      prepare({keyboard: 'en', playStore: 'disabled', reverseList: 'exits 3'}),
      prepare({keyboard: 'ja', playStore: 'disabled', reverseList: 'exits 3'}),
    ]).toEqual([
      {
        status: 0,
        calls: [
          'adb shell settings put global hide_error_dialogs 1',
          'adb shell pm disable-user --user 0 com.android.vending',
          'adb shell pm list packages -d com.android.vending',
          ...SETTLE_AND_DIAGNOSE,
          ...DEVICE_SETTINGS,
          ...SERVE,
        ],
        phases: [
          'self-update block: disabling com.android.vending succeeded, pm list packages -d lists it',
          'settle start',
          'settle done after 0s quiet=30',
          'diagnose start',
          'chrome flags',
          'soft keyboard',
          'logcat',
          'http ok',
          'adb reverse --list rc=3',
        ],
      },
      {
        status: 0,
        calls: [
          'adb shell cat /proc/sys/kernel/random/boot_id',
          'adb shell echo $(date +%s) $(cat /proc/uptime)',
          'adb logcat -G 16M -b main',
          'adb logcat -d -v epoch -b main',
          'adb logcat -S -b main',
          'adb shell settings put global hide_error_dialogs 1',
          'adb shell pm disable-user --user 0 com.android.vending',
          'adb shell pm list packages -d com.android.vending',
          ...SETTLE_AND_DIAGNOSE,
          ...DEVICE_SETTINGS,
          'node setup-ja.js out',
          'node dictionary.js wait out 1793515010',
          'node dictionary.js check out http://localhost:8765/editor.html',
          ...SERVE,
        ],
        phases: [
          'boot capture',
          'self-update block: disabling com.android.vending succeeded, pm list packages -d lists it',
          'settle start',
          'settle done after 0s quiet=30',
          'diagnose start',
          'chrome flags',
          'soft keyboard',
          'japanese setup',
          'japanese setup rc=0',
          'japanese dictionary wait',
          'japanese dictionary wait rc=0',
          'japanese dictionary check',
          'japanese dictionary check rc=0',
          'logcat',
          'http ok',
          'adb reverse --list rc=3',
        ],
        captureHeader:
          'CAPTURE boot_id=62cd1ade-9b02-4723-ba9e-2749dda3d074 btime=1793514968',
      },
    ])
  })
})

describe('prepare.sh on the retry, in the out dir of a prep whose dictionary never loaded', () => {
  test('quotes the reason its own wait printed, and exits 1 for a capture fault', () => {
    expect(
      prepareTwice(
        {keyboard: 'ja', playStore: 'disabled', dictionary: 'never'},
        {keyboard: 'ja', playStore: 'disabled', dictionary: 'capture fault'},
      ).map(({status, phases}) => ({status, failure: phases.at(-1)})),
    ).toEqual([
      {
        status: 3,
        failure: `PREP FAILED: ${NEVER_LOADED} See ja-dictionary.log for the dictionary lines it saw.`,
      },
      {
        status: 1,
        failure: `PREP FAILED: ${CAPTURE_FAULT} See ja-dictionary.log for the dictionary lines it saw.`,
      },
    ])
  })

  test('exits 1 for a wait that exited 3 without a reason of its own, whatever reason the first wait left in `ja-dictionary.log`', () => {
    expect(
      prepareTwice(
        {keyboard: 'ja', playStore: 'disabled', dictionary: 'never'},
        {
          keyboard: 'ja',
          playStore: 'disabled',
          dictionary: 'exits 3 without reason',
        },
      ).map(({status, phases}) => ({status, failure: phases.at(-1)})),
    ).toEqual([
      {
        status: 3,
        failure: `PREP FAILED: ${NEVER_LOADED} See ja-dictionary.log for the dictionary lines it saw.`,
      },
      {
        status: 1,
        failure:
          'PREP FAILED: japanese dictionary wait gave no reason, see ja-dictionary.log',
      },
    ])
  })
})

describe('prepare.sh on the retry, in an out dir whose `ja-dictionary.log` ends in a line cut off before its newline', () => {
  // What a first prep's `tee` left when a write limit stopped it mid-line.
  const cutOff = `DICTIONARY FAILED: ${NEVER_LOADED.slice(0, 120)}`

  test('quotes only the reason its own wait printed, and exits 1 for a capture fault', () => {
    const result = prepare({
      keyboard: 'ja',
      playStore: 'disabled',
      dictionary: 'capture fault',
      earlierDictionaryLog: cutOff,
    })

    expect({status: result.status, failure: result.phases.at(-1)}).toEqual({
      status: 1,
      failure: `PREP FAILED: ${CAPTURE_FAULT} See ja-dictionary.log for the dictionary lines it saw.`,
    })
  })

  test('exits 1 for a wait that exited 3 without a reason of its own', () => {
    const result = prepare({
      keyboard: 'ja',
      playStore: 'disabled',
      dictionary: 'exits 3 without reason',
      earlierDictionaryLog: cutOff,
    })

    expect({status: result.status, failure: result.phases.at(-1)}).toEqual({
      status: 1,
      failure:
        'PREP FAILED: japanese dictionary wait gave no reason, see ja-dictionary.log',
    })
  })
})

describe('prepare.sh with a boot capture reader that ignores SIGTERM', () => {
  test('stops the reader before it returns from a prep that passed', async () => {
    expect(await prepareWithStubbornReader({path: 'passes'})).toEqual({
      status: 0,
      readersStarted: true,
      readersLeft: [],
    })
  }, 30_000)

  test('stops the reader before it returns from a prep whose dictionary never loaded, and exits 3 for it through the deadline', async () => {
    expect(await prepareWithStubbornReader({path: 'never loads'})).toEqual({
      status: 3,
      readersStarted: true,
      readersLeft: [],
    })
  }, 30_000)

  test('stops the reader before it returns from a prep that ran past its deadline', async () => {
    expect(await prepareWithStubbornReader({path: 'runs past'})).toEqual({
      status: 1,
      readersStarted: true,
      readersLeft: [],
    })
  }, 30_000)

  test('stops the reader before it exits when the prep is terminated from outside', async () => {
    expect(await prepareWithStubbornReader({path: 'terminated'})).toEqual({
      status: 143,
      readersStarted: true,
      readersLeft: [],
    })
  }, 30_000)
})

/**
 * Runs `prepare.sh` with fake `adb`, `node`, `curl` and `sleep` that record their calls in order, all but
 * the background reader of the boot capture, which runs alongside the prep in no fixed order to its calls.
 * `playStore` is how `pm disable-user` answers: it disables Play Store, the device refuses, or it never
 * answers. With `dictionary: 'never'` the dictionary wait fails as it did on a real boot, exiting 3 as
 * `dictionary.js wait` does for a dictionary that never loaded. With `capture fault` it fails on a capture of
 * another boot, with `exits 3 without reason` it exits 3 printing no `DICTIONARY FAILED:` line, with
 * `check fails` the check after the load fails, with `setup: 'exits 3'` the Japanese setup exits 3, and with
 * `reverseList: 'exits 3'` the prep's last command, `adb reverse --list`, exits 3.
 */
function prepare(options: PrepareOptions) {
  const directory = mkdtempSync(join(tmpdir(), 'thumbjar-prepare-'))
  try {
    return prepareIn(directory, options)
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

/** Runs `prepare` twice in one directory, so the second prep finds the first one's `out`, as a retry does. */
function prepareTwice(first: PrepareOptions, second: PrepareOptions) {
  const directory = mkdtempSync(join(tmpdir(), 'thumbjar-prepare-'))
  try {
    return [prepareIn(directory, first), prepareIn(directory, second)]
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

type PrepareOptions = {
  keyboard: 'en' | 'ja'
  playStore: 'disabled' | 'refused' | 'hung'
  dictionary?:
    | 'loaded'
    | 'never'
    | 'capture fault'
    | 'exits 3 without reason'
    | 'check fails'
  setup?: 'exits 3'
  reverseList?: 'exits 3'
  /** What an earlier prep left in `out/ja-dictionary.log`, written before this prep runs. */
  earlierDictionaryLog?: string
  /** More environment the prep inherits from its caller. */
  env?: Record<string, string>
}

/** One prep in `directory`, reporting only the calls and phases of this prep. */
function prepareIn(directory: string, options: PrepareOptions) {
  const bin = join(directory, 'bin')
  const calls = join(directory, 'calls.log')
  const phases = join(directory, 'out/phases.log')
  const earlierPhases = existsSync(phases)
    ? readFileSync(phases, 'utf8').length
    : 0
  rmSync(calls, {force: true})
  mkdirSync(bin, {recursive: true})
  if (options.earlierDictionaryLog !== undefined) {
    mkdirSync(join(directory, 'out'), {recursive: true})
    writeFileSync(
      join(directory, 'out/ja-dictionary.log'),
      options.earlierDictionaryLog,
    )
  }
  writeFileSync(
    join(bin, 'adb'),
    `#!/usr/bin/env bash
case "$*" in
  "logcat -v epoch -b main") exec ${realSleep} 60 ;;
esac
echo "adb $*" >> ${calls}
case "$*" in
  "shell cat /proc/sys/kernel/random/boot_id") echo 62cd1ade-9b02-4723-ba9e-2749dda3d074 ;;
  "shell echo \\$(date +%s) \\$(cat /proc/uptime)") echo '1793515008 40.00 31.20' ;;
  "logcat -d -v epoch -b main") printf '%s\\n' '--------- beginning of main' '         1793514994.898   668   799 I ArtService: Dexopt result' ;;
  "logcat -S -b main") printf '%s\\n' 'size/num main' 'Total 1560142/9812' 'Now 1102028/6947' ;;
  "shell pm disable-user --user 0 com.android.vending")
  ${playStoreAnswer(options.playStore)}
  ;;
  "shell pm list packages -d com.android.vending")
  ${options.playStore === 'disabled' ? 'echo package:com.android.vending' : 'exit 0'}
  ;;
  "reverse --list") ${options.reverseList === 'exits 3' ? 'exit 3' : ''} ;;
esac
`,
  )
  writeFileSync(
    join(bin, 'node'),
    `#!/usr/bin/env bash
echo "node $(basename "$1") \${*:2}" >> ${calls}
case "$(basename "$1") $2" in
  "setup-ja.js out") ${options.setup === 'exits 3' ? 'exit 3' : ''} ;;
  "dictionary.js wait")
  ${dictionaryWaitAnswer(options.dictionary)}
  ;;
  "dictionary.js check") ${options.dictionary === 'check fails' ? "echo 'DICTIONARY FAILED: Gboard did not convert with its Japanese dictionary after the switch' >&2; exit 1" : ''} ;;
esac
exit 0
`,
  )
  writeFileSync(join(bin, 'curl'), '#!/usr/bin/env bash\nexit 0\n')
  writeFileSync(join(bin, 'sleep'), '#!/usr/bin/env bash\nexit 0\n')
  for (const name of ['adb', 'node', 'curl', 'sleep']) {
    chmodSync(join(bin, name), 0o755)
  }

  const result = spawnSync(prepareScript, {
    cwd: directory,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      THUMBJAR_KEYBOARD: options.keyboard,
      THUMBJAR_OUT_DIR: 'out',
      THUMBJAR_PAGE_URL: 'http://localhost:8765/editor.html',
      THUMBJAR_PAGE_PORT: '8765',
      THUMBJAR_BOOTED: '1793515010',
      ...options.env,
    },
  })
  const capture = join(directory, 'out/boot-logcat.txt')
  return {
    status: result.status,
    calls: existsSync(calls)
      ? readFileSync(calls, 'utf8').trimEnd().split('\n')
      : [],
    phases: (existsSync(phases) ? readFileSync(phases, 'utf8') : '')
      .slice(earlierPhases)
      .trimEnd()
      .split('\n')
      .filter((line) => line !== '')
      .map((line) =>
        line
          .replace(/^PHASE \d\d:\d\d:\d\d /, '')
          .replace(/^settle done after \d+s/, 'settle done after 0s'),
      ),
    ...(options.keyboard === 'ja'
      ? {
          captureHeader: existsSync(capture)
            ? readFileSync(capture, 'utf8').split('\n')[0]
            : undefined,
        }
      : {}),
  }
}

/**
 * Runs a Japanese `prepare.sh` whose boot capture reader, the background `adb logcat`, records its pid and
 * ignores SIGTERM. `path` picks how the prep ends: it passes, the dictionary wait fails, the dictionary wait
 * hangs past a 3-second deadline, or the prep gets SIGTERM while the wait hangs. Returns the prep's exit
 * status and the readers still alive once it ended. The deadline path runs a copy of `prepare.sh` whose
 * Japanese deadline is cut to 3 seconds, so the shipped prep reads no deadline of the test's.
 */
async function prepareWithStubbornReader({
  path,
}: {
  path: 'passes' | 'never loads' | 'runs past' | 'terminated'
}) {
  const directory = mkdtempSync(join(tmpdir(), 'thumbjar-prepare-reader-'))
  const readers = join(directory, 'readers')
  const waiting = join(directory, 'waiting')
  try {
    const bin = join(directory, 'bin')
    mkdirSync(bin)
    writeFileSync(
      join(bin, 'adb'),
      `#!/usr/bin/env bash
case "$*" in
  "logcat -v epoch -b main")
    trap '' TERM
    echo $$ >> ${readers}
    while :; do ${realSleep} 0.2; done
    ;;
  "shell cat /proc/sys/kernel/random/boot_id") echo 62cd1ade-9b02-4723-ba9e-2749dda3d074 ;;
  "shell echo \\$(date +%s) \\$(cat /proc/uptime)") echo '1793515008 40.00 31.20' ;;
  "shell pm list packages -d com.android.vending") echo package:com.android.vending ;;
esac
exit 0
`,
    )
    const waitAnswer =
      path === 'passes'
        ? 'exit 0'
        : path === 'never loads'
          ? "echo 'DICTIONARY FAILED: never loaded' >&2; exit 3"
          : `touch ${waiting}; exec ${realSleep} 60`
    writeFileSync(
      join(bin, 'node'),
      `#!/usr/bin/env bash
case "$(basename "$1") $2" in
  "dictionary.js wait")
    # Waits for the capture reader to start, so every path has one to stop.
    until [ -s ${readers} ]; do ${realSleep} 0.05; done
    ${waitAnswer}
    ;;
esac
exit 0
`,
    )
    writeFileSync(join(bin, 'curl'), '#!/usr/bin/env bash\nexit 0\n')
    // Skips the settle's pauses but keeps the capture's own sub-second grace, which the cleanup waits on.
    writeFileSync(
      join(bin, 'sleep'),
      `#!/usr/bin/env bash\ncase "$1" in 0.*) exec ${realSleep} "$1" ;; esac\nexit 0\n`,
    )
    for (const name of ['adb', 'node', 'curl', 'sleep']) {
      chmodSync(join(bin, name), 0o755)
    }

    const script = spawn(scriptFor(path, directory), {
      cwd: directory,
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        THUMBJAR_KEYBOARD: 'ja',
        THUMBJAR_OUT_DIR: 'out',
        THUMBJAR_PAGE_URL: 'http://localhost:8765/editor.html',
        THUMBJAR_PAGE_PORT: '8765',
        THUMBJAR_BOOTED: '1793515010',
      },
    })
    const exited = new Promise<number | null>((resolve) =>
      script.once('exit', (code) => resolve(code)),
    )
    if (path === 'terminated') {
      await vi.waitFor(
        () => {
          expect(existsSync(waiting)).toEqual(true)
        },
        {timeout: 10_000},
      )
      process.kill(script.pid ?? 0, 'SIGTERM')
    }
    const status = await exited
    const started = existsSync(readers)
      ? readFileSync(readers, 'utf8').trim().split('\n').map(Number)
      : []
    const left = started.filter((pid) => isAlive(pid))
    for (const pid of left) {
      process.kill(pid, 'SIGKILL')
    }
    try {
      process.kill(-(script.pid ?? 0), 'SIGKILL')
    } catch {}
    return {status, readersStarted: started.length > 0, readersLeft: left}
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

/**
 * The prep script `path` runs: `prepare.sh` itself, or for `runs past` a copy beside a copy of
 * `diagnose.sh` with its Japanese deadline cut to 3 seconds.
 */
function scriptFor(path: string, directory: string): string {
  if (path !== 'runs past') {
    return prepareScript
  }
  const copies = join(directory, 'prepare')
  mkdirSync(copies)
  const source = readFileSync(prepareScript, 'utf8')
  const shortened = source.replace(
    '  ja) deadline=862 ;;',
    '  ja) deadline=3 ;;',
  )
  expect(shortened).not.toEqual(source)
  writeFileSync(join(copies, 'prepare.sh'), shortened)
  copyFileSync(
    fileURLToPath(new URL('diagnose.sh', import.meta.url)),
    join(copies, 'diagnose.sh'),
  )
  chmodSync(join(copies, 'prepare.sh'), 0o755)
  chmodSync(join(copies, 'diagnose.sh'), 0o755)
  return join(copies, 'prepare.sh')
}

/** Whether `pid` still runs. A process that died and waits to be reaped, a zombie, does not. */
function isAlive(pid: number): boolean {
  try {
    return !/^\d+ \(.*\) Z /.test(readFileSync(`/proc/${pid}/stat`, 'utf8'))
  } catch {
    return false
  }
}

function shellString(text: string) {
  return `'${text.replaceAll("'", "'\\''")}'`
}

function dictionaryWaitAnswer(dictionary: PrepareOptions['dictionary']) {
  if (dictionary === 'never') {
    return `printf '%s\\n' ${shellString(`DICTIONARY FAILED: ${NEVER_LOADED}`)} 'Dictionary lines seen:' '1793515060.365  1756  4711 E native  : Fallback to minimal engine.' >&2; exit 3`
  }
  if (dictionary === 'capture fault') {
    return `echo ${shellString(`DICTIONARY FAILED: ${CAPTURE_FAULT}`)} >&2; exit 1`
  }
  if (dictionary === 'exits 3 without reason') {
    return 'exit 3'
  }
  return "echo 'DICTIONARY loaded 120.1s after boot'"
}

function playStoreAnswer(answer: 'disabled' | 'refused' | 'hung') {
  if (answer === 'disabled') {
    return "echo 'Package com.android.vending new state: disabled-user'"
  }
  if (answer === 'refused') {
    return "echo \"Exception occurred while executing 'disable-user':\" >&2; echo 'java.lang.SecurityException: Shell cannot change component state for com.android.vending/null to 3' >&2; exit 255"
  }
  return `exec ${realSleep} 60`
}
