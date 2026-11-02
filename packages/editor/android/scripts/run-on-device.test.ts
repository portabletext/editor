import {spawn, spawnSync} from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, test, vi} from 'vitest'

const android = fileURLToPath(new URL('..', import.meta.url))
const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const realTee = spawnSync('bash', ['-c', 'command -v tee'], {
  encoding: 'utf8',
}).stdout.trim()

describe('run-on-device.sh', () => {
  test('prepares the language it is given and runs only the file it is given, under that file’s cap', () => {
    expect([
      runOnDevice({
        lang: 'ja',
        file: 'tests/ja.test.ts',
        prep: 0,
        tests: 0,
        getState: 'device',
      }),
      runOnDevice({
        lang: 'en',
        file: 'tests/en-textarea.test.ts',
        prep: 0,
        tests: 0,
        getState: 'device',
      }),
    ]).toEqual([
      {
        status: 0,
        calls: [
          'pnpm exec thumbjar prepare --keyboard ja --page-url http://localhost:8765/editor.html --out-dir android/out',
          'pnpm exec vitest run --config vitest.android.config.ts --project device tests/ja.test.ts',
          'adb logcat -d -b crash',
          'adb shell dumpsys activity exit-info com.android.chrome',
          'adb exec-out screencap -p',
        ],
        phases: [
          'http server',
          'tests start, tests/ja.test.ts under 1825 seconds',
          'tests rc=0',
        ],
        timing: ['BOOTED', 'CHECKED skipped', 'DONE'],
      },
      {
        status: 0,
        calls: [
          'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out',
          'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en-textarea.test.ts',
          'adb logcat -d -b crash',
          'adb shell dumpsys activity exit-info com.android.chrome',
          'adb exec-out screencap -p',
        ],
        phases: [
          'http server',
          'tests start, tests/en-textarea.test.ts under 675 seconds',
          'tests rc=0',
        ],
        timing: ['BOOTED', 'CHECKED skipped', 'DONE'],
      },
    ])
  })

  test('reads `adb get-state` once the failed test stage ended, and leaves a reachable device unmarked', () => {
    expect(
      runOnDevice({
        lang: 'en',
        file: 'tests/en.test.ts',
        prep: 0,
        tests: 1,
        getState: 'device',
      }),
    ).toEqual({
      status: 1,
      calls: [
        'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out',
        'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en.test.ts',
        'adb get-state',
        'adb logcat -d -b crash',
        'adb shell dumpsys activity exit-info com.android.chrome',
        'adb exec-out screencap -p',
      ],
      phases: [
        'http server',
        'tests start, tests/en.test.ts under 1825 seconds',
        'tests rc=1',
        'device check: device',
      ],
      timing: ['BOOTED', 'CHECKED device', 'DONE'],
    })
  })

  test('marks the device lost when adb has none once the failed test stage ended', () => {
    expect(
      runOnDevice({
        lang: 'en',
        file: 'tests/en.test.ts',
        prep: 0,
        tests: 1,
        getState: 'none',
      }),
    ).toEqual({
      status: 1,
      calls: [
        'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out',
        'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en.test.ts',
        'adb get-state',
        'adb logcat -d -b crash',
        'adb shell dumpsys activity exit-info com.android.chrome',
        'adb exec-out screencap -p',
      ],
      phases: [
        'http server',
        'tests start, tests/en.test.ts under 1825 seconds',
        'tests rc=1',
        'device check: lost',
      ],
      timing: ['BOOTED', 'CHECKED lost', 'DONE'],
    })
  })

  test('reads `adb get-state` once a failed prep ended, and runs no tests', () => {
    expect([
      runOnDevice({
        lang: 'ja',
        file: 'tests/ja.test.ts',
        prep: 1,
        tests: 0,
        getState: 'device',
      }),
      runOnDevice({
        lang: 'ja',
        file: 'tests/ja.test.ts',
        prep: 1,
        tests: 0,
        getState: 'none',
      }),
    ]).toEqual([
      {
        status: 1,
        calls: [
          'pnpm exec thumbjar prepare --keyboard ja --page-url http://localhost:8765/editor.html --out-dir android/out',
          'adb get-state',
        ],
        phases: ['http server', 'device check: device'],
        timing: ['BOOTED', 'CHECKED device'],
      },
      {
        status: 1,
        calls: [
          'pnpm exec thumbjar prepare --keyboard ja --page-url http://localhost:8765/editor.html --out-dir android/out',
          'adb get-state',
        ],
        phases: ['http server', 'device check: lost'],
        timing: ['BOOTED', 'CHECKED lost'],
      },
    ])
  })
})

describe('run-on-device.sh cut off by its run step', () => {
  test('leaves a run the step stopped during the tests, before its device check, without `CHECKED`', async () => {
    expect(
      await interruptOnDevice({
        lang: 'en',
        file: 'tests/en.test.ts',
        stopAt: 'tests',
        getState: 'device',
      }),
    ).toEqual({
      calls: [
        'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out',
        'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en.test.ts',
      ],
      timing: ['BOOTED'],
    })
  })

  test('keeps the verdict of a device check the step stopped while it logged it', async () => {
    expect([
      await interruptOnDevice({
        lang: 'en',
        file: 'tests/en.test.ts',
        stopAt: 'device check log',
        getState: 'device',
      }),
      await interruptOnDevice({
        lang: 'en',
        file: 'tests/en.test.ts',
        stopAt: 'device check log',
        getState: 'none',
      }),
    ]).toEqual([
      {
        calls: [
          'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out',
          'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en.test.ts',
          'adb get-state',
        ],
        timing: ['BOOTED', 'CHECKED device'],
      },
      {
        calls: [
          'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out',
          'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en.test.ts',
          'adb get-state',
        ],
        timing: ['BOOTED', 'CHECKED lost'],
      },
    ])
  })
})

describe('run-on-device.sh with a device check that never completes', () => {
  test('records no `CHECKED` when the check runs past its own timeout', () => {
    expect(
      runOnDevice({
        lang: 'en',
        file: 'tests/en.test.ts',
        prep: 0,
        tests: 1,
        getState: 'stalled',
      }),
    ).toEqual({
      status: 1,
      calls: [
        'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out',
        'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en.test.ts',
        'adb get-state',
        'adb logcat -d -b crash',
        'adb shell dumpsys activity exit-info com.android.chrome',
        'adb exec-out screencap -p',
      ],
      phases: [
        'http server',
        'tests start, tests/en.test.ts under 1825 seconds',
        'tests rc=1',
        'device check: unchecked',
      ],
      timing: ['BOOTED', 'DONE'],
    })
  }, 30_000)

  test('records no `CHECKED` when `adb get-state` hangs past the check’s limit', () => {
    expect(
      runOnDevice({
        lang: 'en',
        file: 'tests/en.test.ts',
        prep: 0,
        tests: 1,
        getState: 'hung',
      }),
    ).toEqual({
      status: 1,
      calls: [
        'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out',
        'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en.test.ts',
        'adb get-state',
        'adb logcat -d -b crash',
        'adb shell dumpsys activity exit-info com.android.chrome',
        'adb exec-out screencap -p',
      ],
      phases: [
        'http server',
        'tests start, tests/en.test.ts under 1825 seconds',
        'tests rc=1',
        'device check: unchecked',
      ],
      timing: ['BOOTED', 'DONE'],
    })
  }, 30_000)
})

function runOnDevice(options: {
  lang: string
  file: string
  prep: number
  tests: number
  getState: 'device' | 'none' | 'stalled' | 'hung'
}) {
  const directory = mkdtempSync(join(tmpdir(), 'run-on-device-'))
  try {
    const bin = join(directory, 'bin')
    const calls = join(directory, 'calls.log')
    deviceTree(directory)
    writeFileSync(
      join(bin, 'pnpm'),
      `#!/usr/bin/env bash
case "$*" in
  "exec thumbjar serve"*) exit 0 ;;
  "exec thumbjar prepare"*) echo "pnpm $*" >> ${calls}; exit ${options.prep} ;;
  "exec vitest"*) echo "pnpm $*" >> ${calls}; exit ${options.tests} ;;
esac
`,
    )
    writeFileSync(
      join(bin, 'adb'),
      `#!/usr/bin/env bash
case "$*" in
  "logcat -v time") exit 0 ;;
  get-state)
    echo "adb $*" >> ${calls}
    echo '* daemon not running; starting now at tcp:5037' >&2
    ${getStateAnswer(options.getState)}
    ;;
  *) echo "adb $*" >> ${calls} ;;
esac
`,
    )
    chmodSync(join(bin, 'pnpm'), 0o755)
    chmodSync(join(bin, 'adb'), 0o755)

    const result = spawnSync(
      join(directory, 'android/run-on-device.sh'),
      [options.file],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          IME_LANG: options.lang,
        },
      },
    )
    const out = join(directory, 'android/out')
    return {
      status: result.status,
      calls: readFileSync(calls, 'utf8').trimEnd().split('\n'),
      phases: readFileSync(join(out, 'phases.log'), 'utf8')
        .trimEnd()
        .split('\n')
        .map((line) => line.replace(/^PHASE \d\d:\d\d:\d\d /, '')),
      timing: readFileSync(join(out, 'timing.txt'), 'utf8')
        .trimEnd()
        .split('\n')
        .map((line) => line.replace(/ at \d+$/, '')),
    }
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

async function interruptOnDevice(options: {
  lang: string
  file: string
  stopAt: 'tests' | 'device check log'
  getState: 'device' | 'none'
}) {
  const directory = mkdtempSync(join(tmpdir(), 'run-on-device-'))
  try {
    const bin = join(directory, 'bin')
    const calls = join(directory, 'calls.log')
    const stopped = join(directory, 'stopped')
    deviceTree(directory)
    writeFileSync(
      join(bin, 'pnpm'),
      `#!/usr/bin/env bash
case "$*" in
  "exec thumbjar serve"*) exit 0 ;;
  "exec thumbjar prepare"*) echo "pnpm $*" >> ${calls}; exit 0 ;;
  "exec vitest"*) echo "pnpm $*" >> ${calls}; ${options.stopAt === 'tests' ? `touch ${stopped}; exec sleep 60` : 'exit 1'} ;;
esac
`,
    )
    writeFileSync(
      join(bin, 'adb'),
      `#!/usr/bin/env bash
case "$*" in
  "logcat -v time") exit 0 ;;
  get-state) echo "adb $*" >> ${calls}; ${getStateAnswer(options.getState)} ;;
  *) echo "adb $*" >> ${calls} ;;
esac
`,
    )
    // Holds the `device check:` log line, the one write after the check, until the step stops the script.
    writeFileSync(
      join(bin, 'tee'),
      `#!/usr/bin/env bash
line=$(cat)
case "$line" in
  *"device check:"*) ${options.stopAt === 'device check log' ? `touch ${stopped}; exec sleep 60` : ''} ;;
esac
printf '%s\\n' "$line" | ${realTee} "$@"
`,
    )
    chmodSync(join(bin, 'pnpm'), 0o755)
    chmodSync(join(bin, 'adb'), 0o755)
    chmodSync(join(bin, 'tee'), 0o755)

    const script = spawn(
      join(directory, 'android/run-on-device.sh'),
      [options.file],
      {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          IME_LANG: options.lang,
        },
      },
    )
    const exited = new Promise((resolve) => script.once('exit', resolve))
    await vi.waitFor(
      () => {
        expect(existsSync(stopped)).toEqual(true)
      },
      {timeout: 10_000},
    )
    // The emulator runner's step timeout kills the script's whole process group.
    process.kill(-(script.pid ?? 0), 'SIGKILL')
    await exited

    return {
      calls: readFileSync(calls, 'utf8').trimEnd().split('\n'),
      timing: readFileSync(join(directory, 'android/out/timing.txt'), 'utf8')
        .trimEnd()
        .split('\n')
        .map((line) => line.replace(/ at \d+$/, '')),
    }
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

function getStateAnswer(state: 'device' | 'none' | 'stalled' | 'hung') {
  if (state === 'device') {
    return 'echo device'
  }
  if (state === 'none') {
    return "echo 'error: no devices/emulators found' >&2; exit 1"
  }
  if (state === 'hung') {
    return 'exec sleep 60'
  }
  // Stops the checker that asked, so only its own timeout ends it.
  return 'kill -STOP $PPID; echo offline'
}

function deviceTree(directory: string) {
  const bin = join(directory, 'bin')
  mkdirSync(bin)
  mkdirSync(join(directory, 'android'))
  copyFileSync(
    join(android, 'run-on-device.sh'),
    join(directory, 'android/run-on-device.sh'),
  )
  for (const name of ['scripts', 'tests']) {
    symlinkSync(join(android, name), join(directory, 'android', name))
  }
  symlinkSync(
    join(packageRoot, 'node_modules'),
    join(directory, 'node_modules'),
  )
}
