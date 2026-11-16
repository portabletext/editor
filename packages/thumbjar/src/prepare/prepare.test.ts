import {ChildProcess, spawn, spawnSync} from 'node:child_process'
import * as childProcesses from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  symlinkSync,
  readdirSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {fileURLToPath} from 'node:url'
import {describe, expect, test, vi} from 'vitest'
import * as processes from '../process.ts'
import * as prepareModule from './prepare.ts'

vi.mock('node:child_process', async (importOriginal) => {
  const children = await importOriginal<typeof import('node:child_process')>()
  return {...children}
})

vi.mock('node:timers/promises', async (importOriginal) => {
  const timers = await importOriginal<typeof import('node:timers/promises')>()
  return {...timers, setTimeout: vi.fn(timers.setTimeout)}
})

let readersAtReturn: number[] = []

const prepareScript = fileURLToPath(new URL('prepare.ts', import.meta.url))
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

test('prepares with no timeout, setsid or pnpm on PATH', async () => {
  const server = spawn(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import http from 'node:http'
    http.createServer((request, response) => response.end('foo')).listen(8765, () => console.log('ready'))
  `,
    ],
    {stdio: ['ignore', 'pipe', 'inherit']},
  )
  try {
    await new Promise<void>((resolve) =>
      server.stdout.once('data', () => resolve()),
    )
    expect(
      prepareWithProcesses({
        keyboard: 'en',
        playStore: 'disabled',
        portable: true,
      }).status,
    ).toEqual(0)
  } finally {
    server.kill()
  }
}, 60_000)

test('passes caller paths and the inherited environment to the dictionary check', () => {
  const directory = mkdtempSync(join(tmpdir(), 'thumbjar-environment-'))
  const bin = join(directory, 'bin')
  const snapshot = join(directory, 'environment.json')
  mkdirSync(bin)
  const out = join(directory, 'artifacts/prep')
  writeFileSync(
    join(bin, 'adb'),
    `#!${process.execPath}
const args=process.argv.slice(2).join(' ')
if(args==='shell cat /proc/sys/kernel/random/boot_id')console.log('62cd1ade-9b02-4723-ba9e-2749dda3d074')
if(args==='shell echo $(date +%s) $(cat /proc/uptime)')console.log('1793515008 40.00 31.20')
if(args==='logcat -d -v epoch -b main')console.log('1793514994.898 668 799 I ArtService: foo')
if(args==='logcat -v epoch -b main')setInterval(()=>{},1000)
if(args==='shell pm list packages -d com.android.vending')console.log('package:com.android.vending')
`,
  )
  chmodSync(join(bin, 'adb'), 0o755)
  const pause = join(directory, 'pause.mjs')
  writeFileSync(pause, 'export const setTimeout=async()=>{}\n')
  const keys = [
    'THUMBJAR_OUT_DIR',
    'THUMBJAR_KEYBOARD',
    'THUMBJAR_PAGE_URL',
    'THUMBJAR_PAGE_PORT',
    'THUMBJAR_BOOTED',
    'PATH',
    'HOME',
    'TMPDIR',
    'ANDROID_HOME',
    'ANDROID_SDK_ROOT',
    'ANDROID_SERIAL',
    'ANDROID_ADB_SERVER_HOST',
    'ANDROID_ADB_SERVER_PORT',
  ]
  const dictionary = `import {writeFileSync} from 'node:fs';if(process.argv[2]==='check')writeFileSync(${JSON.stringify(snapshot)},JSON.stringify({args:process.argv.slice(2),cwd:process.cwd(),env:Object.fromEntries(${JSON.stringify(keys)}.map(key=>[key,process.env[key]??null]))}))`
  const loader = join(directory, 'hooks.mjs')
  writeFileSync(
    loader,
    `import {registerHooks} from 'node:module'
registerHooks({resolve(specifier,context,next){if(specifier==='node:timers/promises')return{url:${JSON.stringify(new URL(`file://${pause}`).href)},shortCircuit:true};return next(specifier,context)},load(url,context,next){if(url.endsWith('/prepare/setup-ja.ts'))return{format:'module',shortCircuit:true,source:''};if(url.endsWith('/prepare/dictionary.ts'))return{format:'module',shortCircuit:true,source:${JSON.stringify(dictionary)}};return next(url,context)}})
`,
  )
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    HOME: directory,
    TMPDIR: tmpdir(),
    ANDROID_HOME: '/sdk',
    ANDROID_SDK_ROOT: '/sdk-root',
    ANDROID_SERIAL: 'foo',
    ANDROID_ADB_SERVER_HOST: '127.0.0.1',
    ANDROID_ADB_SERVER_PORT: '5037',
    THUMBJAR_OUT_DIR: 'inherited-wrong',
    NODE_OPTIONS: `--import=${loader}`,
  }
  try {
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL('../bin.ts', import.meta.url)),
        'prepare',
        '--keyboard',
        'ja',
        '--page-url',
        'http://localhost:1/editor.html',
        '--out-dir',
        'artifacts/prep',
        '--booted',
        '1793515010',
      ],
      {cwd: directory, env, encoding: 'utf8'},
    )
    expect(result.status).toEqual(1)
    expect(JSON.parse(readFileSync(snapshot, 'utf8'))).toEqual({
      args: ['check', out, 'http://localhost:1/editor.html'],
      cwd: directory,
      env: {
        THUMBJAR_OUT_DIR: out,
        THUMBJAR_KEYBOARD: 'ja',
        THUMBJAR_PAGE_URL: 'http://localhost:1/editor.html',
        THUMBJAR_PAGE_PORT: '1',
        THUMBJAR_BOOTED: '1793515010',
        PATH: env.PATH,
        HOME: directory,
        TMPDIR: tmpdir(),
        ANDROID_HOME: '/sdk',
        ANDROID_SDK_ROOT: '/sdk-root',
        ANDROID_SERIAL: 'foo',
        ANDROID_ADB_SERVER_HOST: '127.0.0.1',
        ANDROID_ADB_SERVER_PORT: '5037',
      },
    })
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}, 30_000)

test('returns a prep deadline as status 1 when it interrupts the settle pause', () => {
  const result = deadlinePrep(false)
  expect(result).toEqual({status: 1, failure: 'PREP FAILED: prep ran past 1s'})
}, 15_000)

test('returns a prep deadline as status 1 when it interrupts the HTTP retry pause', async () => {
  expect(await deadlineAtHttpPause()).toEqual({
    status: 1,
    failure: 'PREP FAILED: prep ran past 5s',
    reachedHTTP: true,
  })
}, 15_000)

test('keeps the prep deadline status when its stage needs SIGKILL', () => {
  const result = deadlinePrep(true)
  expect(result).toEqual({status: 1, failure: 'PREP FAILED: prep ran past 1s'})
}, 15_000)

describe('prepare.sh', () => {
  test('disables Play Store before the settle and logs one line saying the disable succeeded and Play Store is listed as disabled', async () => {
    expect(await prepareWithoutProcesses('disabled')).toEqual({
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

  test('logs a failed disable that leaves Play Store enabled, and goes on with the prep', async () => {
    expect(await prepareWithoutProcesses('refused')).toEqual({
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
    expect(prepareWithProcesses({keyboard: 'en', playStore: 'hung'})).toEqual({
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

  test('reads no deadline from the environment, so an inherited THUMBJAR_PREP_DEADLINE leaves the prep as it is', async () => {
    expect(
      await prepare({
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

  test('captures the boot before anything else, then waits for the Japanese dictionary from when the emulator came online and checks it on the page after the Japanese setup, before the prep ends', async () => {
    expect(await prepare({keyboard: 'ja', playStore: 'disabled'})).toEqual({
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

  test('fails the prep with the wait’s own reason, leading with the dictionary that never loaded, exits 3 for it, and neither checks it nor serves the page', async () => {
    expect(
      await prepare({
        keyboard: 'ja',
        playStore: 'disabled',
        dictionary: 'never',
      }),
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

  test('fails the prep with exit status 1 when the wait finds a capture that cannot show the load', async () => {
    expect(
      await prepare({
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

  test('fails the prep with exit status 1 when Gboard did not convert after the load', async () => {
    expect(
      await prepare({
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

  test('fails the prep with exit status 1 when the Japanese setup failed, even when the setup exited 3', async () => {
    expect(
      await prepare({keyboard: 'ja', playStore: 'disabled', setup: 'exits 3'}),
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
  test('logs the status of `adb reverse --list`, its last command, and never takes it as the prep’s, so its exit 3 neither fails the prep nor reads as a dictionary that never loaded', async () => {
    expect([
      await prepare({
        keyboard: 'en',
        playStore: 'disabled',
        reverseList: 'exits 3',
      }),
      await prepare({
        keyboard: 'ja',
        playStore: 'disabled',
        reverseList: 'exits 3',
      }),
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
  }, 15_000)
})

describe('prepare.sh on the retry, in the out dir of a prep whose dictionary never loaded', () => {
  test('quotes the reason its own wait printed, and exits 1 for a capture fault', async () => {
    expect(
      (
        await prepareTwice(
          {keyboard: 'ja', playStore: 'disabled', dictionary: 'never'},
          {keyboard: 'ja', playStore: 'disabled', dictionary: 'capture fault'},
        )
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
  }, 15_000)

  test('exits 1 for a wait that exited 3 without a reason of its own, whatever reason the first wait left in `ja-dictionary.log`', async () => {
    expect(
      (
        await prepareTwice(
          {keyboard: 'ja', playStore: 'disabled', dictionary: 'never'},
          {
            keyboard: 'ja',
            playStore: 'disabled',
            dictionary: 'exits 3 without reason',
          },
        )
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
  }, 15_000)
})

describe('prepare.sh on the retry, in an out dir whose `ja-dictionary.log` ends in a line cut off before its newline', () => {
  const cutOff = `DICTIONARY FAILED: ${NEVER_LOADED.slice(0, 120)}`

  test('quotes only the reason its own wait printed, and exits 1 for a capture fault', async () => {
    const result = await prepare({
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

  test('exits 1 for a wait that exited 3 without a reason of its own', async () => {
    const result = await prepare({
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
    expect(readersAtReturn).toEqual([])
  }, 30_000)

  test('stops the reader before it returns from a prep whose dictionary never loaded, and exits 3 for it through the deadline', async () => {
    expect(await prepareWithStubbornReader({path: 'never loads'})).toEqual({
      status: 3,
      readersStarted: true,
      readersLeft: [],
    })
    expect(readersAtReturn).toEqual([])
  }, 30_000)

  test('stops the reader before it returns from a prep that ran past its deadline', async () => {
    expect(await prepareWithStubbornReader({path: 'runs past'})).toEqual({
      status: 1,
      readersStarted: true,
      readersLeft: [],
    })
    expect(readersAtReturn).toEqual([])
  }, 30_000)

  test('stops the reader before it exits when the prep is terminated from outside', async () => {
    expect(await prepareWithStubbornReader({path: 'terminated'})).toEqual({
      status: 143,
      readersStarted: true,
      readersLeft: [],
    })
    expect(readersAtReturn).toEqual([])
  }, 30_000)
  test('ends the capture worker and its adb when prepare is SIGKILLed', async () => {
    expect(await prepareWithStubbornReader({path: 'killed'})).toEqual({
      status: null,
      readersStarted: true,
      readersLeft: [],
    })
  }, 30_000)
})

function prepareWithProcesses(options: PrepareOptions) {
  const directory = mkdtempSync(join(tmpdir(), 'thumbjar-prepare-'))
  try {
    return prepareIn(directory, options)
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

/** Runs `prepare` twice in one directory, so the second prep finds the first one's `out`, as a retry does. */
async function prepareTwice(first: PrepareOptions, second: PrepareOptions) {
  const directory = mkdtempSync(join(tmpdir(), 'thumbjar-prepare-'))
  try {
    return [await prepare(first, directory), await prepare(second, directory)]
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

type PrepareOptions = {
  keyboard: 'en' | 'ja'
  portable?: boolean
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
  for (const name of ['adb', 'node']) {
    chmodSync(join(bin, name), 0o755)
  }

  if (options.portable) {
    for (const name of readdirSync('/usr/bin')) {
      if (
        !['timeout', 'setsid', 'pnpm', 'adb', 'node', 'curl', 'sleep'].includes(
          name,
        )
      ) {
        symlinkSync(join('/usr/bin', name), join(bin, name))
      }
    }
  }
  const result = spawnSync(
    process.execPath,
    options.portable
      ? [
          fileURLToPath(new URL('../bin.ts', import.meta.url)),
          'prepare',
          '--keyboard',
          options.keyboard,
          '--page-url',
          'http://localhost:8765/editor.html',
          '--out-dir',
          'out',
          '--booted',
          '1793515010',
        ]
      : [scriptFor('passes', directory)],
    {
      cwd: directory,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: options.portable ? bin : `${bin}:${process.env.PATH}`,
        THUMBJAR_KEYBOARD: options.keyboard,
        THUMBJAR_OUT_DIR: 'out',
        THUMBJAR_PAGE_URL: 'http://localhost:8765/editor.html',
        THUMBJAR_PAGE_PORT: '8765',
        THUMBJAR_BOOTED: '1793515010',
        ...options.env,
      },
    },
  )
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

async function prepareWithStubbornReader({
  path,
}: {
  path: 'passes' | 'never loads' | 'runs past' | 'terminated' | 'killed'
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
    echo $PPID >> ${join(directory, 'capture-pids')}
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
    for (const name of ['adb', 'node']) {
      chmodSync(join(bin, name), 0o755)
    }

    const script = spawn(process.execPath, [scriptFor(path, directory)], {
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
    if (path === 'terminated' || path === 'killed') {
      await vi.waitFor(
        () => {
          expect(existsSync(waiting)).toEqual(true)
        },
        {timeout: 10_000},
      )
      process.kill(script.pid ?? 0, path === 'killed' ? 'SIGKILL' : 'SIGTERM')
    }
    const status = await exited
    if (path !== 'killed') {
      readersAtReturn = JSON.parse(
        readFileSync(join(directory, 'at-return.json'), 'utf8'),
      )
    }
    const started = existsSync(readers)
      ? readFileSync(readers, 'utf8').trim().split('\n').map(Number)
      : []
    if (path === 'killed') {
      const captures = readFileSync(join(directory, 'capture-pids'), 'utf8')
        .trim()
        .split('\n')
        .map(Number)
      await vi.waitFor(
        () =>
          expect(
            [...started, ...captures].filter((pid) => isAlive(pid)),
          ).toEqual([]),
        {timeout: 8000},
      )
    }
    const left = started.filter((pid) => isAlive(pid))
    for (const pid of left) {
      process.kill(pid, 'SIGKILL')
    }
    try {
      process.kill(-(script.pid ?? 0), 'SIGKILL')
    } catch {}
    return {status, readersStarted: started.length > 0, readersLeft: left}
  } finally {
    for (const name of ['readers', 'capture-pids']) {
      const path = join(directory, name)
      if (existsSync(path)) {
        for (const pid of readFileSync(path, 'utf8')
          .trim()
          .split('\n')
          .map(Number)) {
          try {
            process.kill(pid, 'SIGKILL')
          } catch {}
        }
      }
    }
    rmSync(directory, {recursive: true, force: true})
  }
}

function scriptFor(path: string, directory: string): string {
  const source = `import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {prepare} from ${JSON.stringify(prepareScript)}
process.exitCode = await prepare({
  keyboard: process.env.THUMBJAR_KEYBOARD,
  out: process.env.THUMBJAR_OUT_DIR,
  pageUrl: process.env.THUMBJAR_PAGE_URL,
  port: process.env.THUMBJAR_PAGE_PORT,
  booted: Number(process.env.THUMBJAR_BOOTED),
}, {
  node: ${JSON.stringify(join(directory, 'bin/node'))},
  setup: 'setup-ja.js', dictionary: 'dictionary.js',
  sleep: async () => {}, request: async () => true,
  deadline: undefined,
})
const readers=${JSON.stringify(join(directory, 'readers'))}
if(existsSync(readers))writeFileSync(${JSON.stringify(join(directory, 'at-return.json'))},JSON.stringify(readFileSync(readers,'utf8').trim().split('\\n').map(Number).filter(pid=>{try{return !/^\\d+ \\(.*\\) Z /.test(readFileSync('/proc/'+pid+'/stat','utf8'))}catch{return false}})))
`
  const shortened =
    path === 'runs past'
      ? source.replace('deadline: undefined', 'deadline: 3')
      : source
  if (path === 'runs past') {
    expect(shortened).not.toEqual(source)
  }
  const bootstrap = join(directory, 'prepare.mjs')
  writeFileSync(bootstrap, shortened)
  return bootstrap
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

function deadlinePrep(stubborn: boolean) {
  const directory = mkdtempSync(join(tmpdir(), 'thumbjar-deadline-'))
  try {
    const bin = join(directory, 'bin')
    mkdirSync(bin)
    writeFileSync(
      join(bin, 'adb'),
      `#!${process.execPath}
${stubborn ? "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)" : ''}
`,
    )
    chmodSync(join(bin, 'adb'), 0o755)
    const bootstrap = join(directory, 'prep.mjs')
    writeFileSync(
      bootstrap,
      `import {prepare,prepDeadlines} from ${JSON.stringify(prepareScript)}
${stubborn ? 'prepDeadlines.adb.killAfter=20' : ''}
process.exitCode = await prepare({keyboard:'en', out:${JSON.stringify(join(directory, 'out'))}, pageUrl:'http://localhost:1/', port:'', booted:0}, {deadline:1})
`,
    )
    const result = spawnSync(process.execPath, [bootstrap], {
      encoding: 'utf8',
      env: {...process.env, PATH: `${bin}:${process.env.PATH}`},
    })
    const phases = join(directory, 'out/phases.log')
    return {
      status: result.status,
      failure: existsSync(phases)
        ? readFileSync(phases, 'utf8')
            .trimEnd()
            .split('\n')
            .at(-1)
            ?.replace(/^PHASE \d\d:\d\d:\d\d /, '')
        : undefined,
    }
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

async function controlledPrepare(
  settings: PrepareOptions,
  http = false,
  previousDirectory?: string,
) {
  const directory =
    previousDirectory ?? mkdtempSync(join(tmpdir(), 'thumbjar-controlled-'))
  const out = join(directory, 'out')
  const phaseFile = join(out, 'phases.log')
  const earlierPhases = existsSync(phaseFile)
    ? readFileSync(phaseFile, 'utf8').length
    : 0
  if (settings.earlierDictionaryLog !== undefined) {
    mkdirSync(out, {recursive: true})
    writeFileSync(join(out, 'ja-dictionary.log'), settings.earlierDictionaryLog)
  }
  const calls: string[] = []
  let reachedHTTP = false
  const clock = new AbortController()
  try {
    for (const [name, value] of Object.entries(settings.env ?? {})) {
      vi.stubEnv(name, value)
    }
    vi.spyOn(childProcesses, 'spawn').mockReturnValue(new ChildProcess())
    vi.spyOn(processes, 'execute').mockImplementation(
      (command, args, options) => {
        options.signal?.throwIfAborted()
        calls.push(
          `${command} ${args.map((argument) => (argument === out ? 'out' : argument)).join(' ')}`,
        )
        let stdout = ''
        let status = 0
        if (
          args.join(' ') ===
          'shell pm disable-user --user 0 com.android.vending'
        ) {
          if (settings.playStore === 'disabled') {
            stdout = 'Package com.android.vending new state: disabled-user\n'
          } else {
            status = 255
            stdout =
              "Exception occurred while executing 'disable-user':\njava.lang.SecurityException: Shell cannot change component state for com.android.vending/null to 3\n"
          }
        }
        if (
          args.join(' ') === 'shell pm list packages -d com.android.vending' &&
          settings.playStore === 'disabled'
        ) {
          stdout = 'package:com.android.vending\n'
        }
        let stderr = ''
        const answer = {
          'shell cat /proc/sys/kernel/random/boot_id':
            '62cd1ade-9b02-4723-ba9e-2749dda3d074\n',
          'shell echo $(date +%s) $(cat /proc/uptime)':
            '1793515008 40.00 31.20\n',
          'logcat -d -v epoch -b main':
            '--------- beginning of main\n         1793514994.898   668   799 I ArtService: Dexopt result\n',
          'logcat -S -b main':
            'size/num main\nTotal 1560142/9812\nNow 1102028/6947\n',
        }
        stdout = new Map(Object.entries(answer)).get(args.join(' ')) ?? stdout
        if (
          args.join(' ') === 'reverse --list' &&
          settings.reverseList === 'exits 3'
        ) {
          status = 3
        }
        if (command === 'node') {
          if (args[0] === 'setup-ja.js' && settings.setup === 'exits 3') {
            status = 3
          }
          if (args[0] === 'dictionary.js' && args[1] === 'wait') {
            if (settings.dictionary === 'never') {
              status = 3
              stderr = `DICTIONARY FAILED: ${NEVER_LOADED}\nDictionary lines seen:\n1793515060.365  1756  4711 E native  : Fallback to minimal engine.\n`
            } else if (settings.dictionary === 'capture fault') {
              status = 1
              stderr = `DICTIONARY FAILED: ${CAPTURE_FAULT}\n`
            } else if (settings.dictionary === 'exits 3 without reason') {
              status = 3
            } else {
              stdout = 'DICTIONARY loaded 120.1s after boot\n'
            }
          }
          if (
            args[0] === 'dictionary.js' &&
            args[1] === 'check' &&
            settings.dictionary === 'check fails'
          ) {
            status = 1
            stderr =
              'DICTIONARY FAILED: Gboard did not convert with its Japanese dictionary after the switch\n'
          }
        }
        options.stdout?.(Buffer.from(stdout))
        options.stderr?.(Buffer.from(stderr))
        return Promise.resolve({status, stdout, stderr})
      },
    )
    if (http) {
      let first = true
      vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
        if (first) {
          first = false
          return clock.signal
        }
        return new AbortController().signal
      })
      const real = await vi.importActual<typeof import('node:timers/promises')>(
        'node:timers/promises',
      )
      vi.mocked(delay).mockImplementation(
        <Value = void>(
          milliseconds = 1,
          value?: Value,
          options?: Parameters<typeof delay>[2],
        ) => {
          reachedHTTP = true
          clock.abort()
          return real.setTimeout<Value>(milliseconds, value, options)
        },
      )
    }
    const status = await prepareModule.prepare(
      {
        keyboard: settings.keyboard,
        out,
        pageUrl: http
          ? 'http://localhost:1/'
          : 'http://localhost:8765/editor.html',
        port: http ? '' : '8765',
        booted: 1793515010,
      },
      {
        node: 'node',
        setup: 'setup-ja.js',
        dictionary: 'dictionary.js',
        sleep: async () => {},
        ...(http ? {deadline: 5} : {request: () => Promise.resolve(true)}),
      },
    )
    const phases = readFileSync(phaseFile, 'utf8')
      .slice(earlierPhases)
      .trimEnd()
      .split('\n')
      .map((line) =>
        line
          .replace(/^PHASE \d\d:\d\d:\d\d /, '')
          .replace(/^settle done after \d+s/, 'settle done after 0s'),
      )
    return {
      status,
      calls,
      phases,
      reachedHTTP,
      ...(settings.keyboard === 'ja'
        ? {
            captureHeader: readFileSync(
              join(out, 'boot-logcat.txt'),
              'utf8',
            ).split('\n')[0],
          }
        : {}),
    }
  } finally {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.mocked(delay).mockReset()
    if (previousDirectory === undefined) {
      rmSync(directory, {recursive: true, force: true})
    }
  }
}

function prepareWithoutProcesses(playStore: 'disabled' | 'refused') {
  return prepare({keyboard: 'en', playStore})
}

async function deadlineAtHttpPause() {
  const {status, phases, reachedHTTP} = await controlledPrepare(
    {keyboard: 'en', playStore: 'disabled'},
    true,
  )
  return {status, failure: phases.at(-1), reachedHTTP}
}

async function prepare(options: PrepareOptions, directory?: string) {
  const {status, calls, phases, captureHeader} = await controlledPrepare(
    options,
    false,
    directory,
  )
  return {
    status,
    calls,
    phases,
    ...(options.keyboard === 'ja' ? {captureHeader} : {}),
  }
}
