import {spawn, spawnSync} from 'node:child_process'
import {
  chmodSync,
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
import {deviceTestFileSeconds} from '../device/budget.ts'

const command = fileURLToPath(new URL('run.ts', import.meta.url))
// The PREP FAILED line `thumbjar prepare` logs for a real CI boot whose Gboard never loaded the dictionary.
const NEVER_LOADED =
  "Gboard's Japanese dictionary never loaded on this boot: Gboard 15.1.08.726012951-preload-x86_64 logged no `data_loader.cc` `New data is loaded` line for a `mozcdata-<version>.data` file within 360s of boot. It logged `Fallback to minimal engine`, and 2 downloads of `__MOZCPACK_mozcmain_ja_JP` were cancelled. The capture may also lack the line: the main buffer had dropped 2865 of its 9812 lines by the capture's first dump, so the capture may lack lines from boot on, its oldest kept line is from 26.9s after boot, so a load before then would not show. See ja-dictionary.log for the dictionary lines it saw."

describe('thumbjar run', () => {
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
          'pnpm exec thumbjar prepare --keyboard ja --page-url http://localhost:8765/editor.html --out-dir android/out --booted BOOTED',
          'pnpm exec vitest run --config vitest.android.config.ts --project device tests/ja.test.ts',
          'adb logcat -d -b crash',
          'adb shell dumpsys activity exit-info com.android.chrome',
          'adb exec-out screencap -p',
        ],
        phases: [
          'http server',
          `tests start, tests/ja.test.ts under ${deviceTestFileSeconds(3)} seconds`,
          'tests rc=0',
        ],
        timing: ['BOOTED', 'CHECKED skipped', 'DONE'],
      },
      {
        status: 0,
        calls: [
          'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out --booted BOOTED',
          'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en-textarea.test.ts',
          'adb logcat -d -b crash',
          'adb shell dumpsys activity exit-info com.android.chrome',
          'adb exec-out screencap -p',
        ],
        phases: [
          'http server',
          `tests start, tests/en-textarea.test.ts under ${deviceTestFileSeconds(1)} seconds`,
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
        'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out --booted BOOTED',
        'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en.test.ts',
        'adb get-state',
        'adb logcat -d -b crash',
        'adb shell dumpsys activity exit-info com.android.chrome',
        'adb exec-out screencap -p',
      ],
      phases: [
        'http server',
        `tests start, tests/en.test.ts under ${deviceTestFileSeconds(3)} seconds`,
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
        'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out --booted BOOTED',
        'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en.test.ts',
        'adb get-state',
        'adb logcat -d -b crash',
        'adb shell dumpsys activity exit-info com.android.chrome',
        'adb exec-out screencap -p',
      ],
      phases: [
        'http server',
        `tests start, tests/en.test.ts under ${deviceTestFileSeconds(3)} seconds`,
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
          'pnpm exec thumbjar prepare --keyboard ja --page-url http://localhost:8765/editor.html --out-dir android/out --booted BOOTED',
          'adb get-state',
        ],
        phases: ['http server', 'device check: device'],
        timing: ['BOOTED', 'CHECKED device'],
      },
      {
        status: 1,
        calls: [
          'pnpm exec thumbjar prepare --keyboard ja --page-url http://localhost:8765/editor.html --out-dir android/out --booted BOOTED',
          'adb get-state',
        ],
        phases: ['http server', 'device check: lost'],
        timing: ['BOOTED', 'CHECKED lost'],
      },
    ])
  })
})

describe('thumbjar run when the test stage cap cannot be read', () => {
  test('skips the device check and runs no device work for an unreadable file or one with no tests', () => {
    expect([
      runOnDevice({
        lang: 'en',
        file: 'tests/missing.test.ts',
        prep: 0,
        tests: 0,
        getState: 'device',
      }),
      runOnDevice({
        lang: 'en',
        file: 'tests/empty.test.ts',
        prep: 0,
        tests: 0,
        getState: 'device',
      }),
    ]).toEqual([
      {
        status: 1,
        calls: [],
        phases: [
          'PREP FAILED: read the test stage timeout for tests/missing.test.ts',
        ],
        timing: ['BOOTED', 'CHECKED skipped'],
      },
      {
        status: 1,
        calls: [],
        phases: [
          'PREP FAILED: read the test stage timeout for tests/empty.test.ts',
        ],
        timing: ['BOOTED', 'CHECKED skipped'],
      },
    ])
  })
})

describe('thumbjar run after a prep that named its failure', () => {
  test("records the prep's reason for the job summary before the device check, and runs no tests", () => {
    expect(
      runOnDevice({
        lang: 'ja',
        file: 'tests/ja.test.ts',
        prep: 1,
        prepFailure: 'japanese dictionary check, see ja-dictionary.log',
        tests: 0,
        getState: 'device',
      }),
    ).toEqual({
      status: 1,
      calls: [
        'pnpm exec thumbjar prepare --keyboard ja --page-url http://localhost:8765/editor.html --out-dir android/out --booted BOOTED',
        'adb get-state',
      ],
      phases: [
        'http server',
        'PREP FAILED: japanese dictionary check, see ja-dictionary.log',
        'device check: device',
      ],
      timing: [
        'BOOTED',
        'PREP FAILED: japanese dictionary check, see ja-dictionary.log',
        'CHECKED device',
      ],
    })
  })

  test("marks a prep that exited 3, Gboard's Japanese dictionary never loaded, after its reason and before the device check, and runs no tests", () => {
    expect(
      runOnDevice({
        lang: 'ja',
        file: 'tests/ja.test.ts',
        prep: 3,
        prepFailure: NEVER_LOADED,
        tests: 0,
        getState: 'device',
      }),
    ).toEqual({
      status: 1,
      calls: [
        'pnpm exec thumbjar prepare --keyboard ja --page-url http://localhost:8765/editor.html --out-dir android/out --booted BOOTED',
        'adb get-state',
      ],
      phases: [
        'http server',
        `PREP FAILED: ${NEVER_LOADED}`,
        'device check: device',
      ],
      timing: [
        'BOOTED',
        `PREP FAILED: ${NEVER_LOADED}`,
        'PREP DICTIONARY_NOT_LOADED',
        'CHECKED device',
      ],
    })
  })
})

describe('thumbjar run on the retry after adb lost the device', () => {
  test("records no reason for a prep that named none, though `phases.log` holds the first boot's", () => {
    expect(
      runOnDevice({
        lang: 'ja',
        file: 'tests/ja.test.ts',
        earlierPhases: [
          'http server',
          `PREP FAILED: ${NEVER_LOADED}`,
          'device check: lost',
        ],
        prep: 1,
        tests: 0,
        getState: 'device',
      }),
    ).toEqual({
      status: 1,
      calls: [
        'pnpm exec thumbjar prepare --keyboard ja --page-url http://localhost:8765/editor.html --out-dir android/out --booted BOOTED',
        'adb get-state',
      ],
      phases: [
        'http server',
        `PREP FAILED: ${NEVER_LOADED}`,
        'device check: lost',
        'http server',
        'device check: device',
      ],
      timing: ['BOOTED', 'CHECKED device'],
    })
  })
})

describe('thumbjar run cut off by its run step', () => {
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
        'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out --booted BOOTED',
        'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en.test.ts',
      ],
      timing: ['BOOTED'],
    })
  })

  test('stops the script with the `thumbjar` process when only that process is stopped, so no device check follows', async () => {
    expect(
      await interruptOnDevice({
        lang: 'en',
        file: 'tests/en.test.ts',
        stopAt: 'tests',
        getState: 'device',
        kill: 'process',
      }),
    ).toEqual({
      calls: [
        'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out --booted BOOTED',
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
          'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out --booted BOOTED',
          'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en.test.ts',
          'adb get-state',
        ],
        timing: ['BOOTED', 'CHECKED device'],
      },
      {
        calls: [
          'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out --booted BOOTED',
          'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en.test.ts',
          'adb get-state',
        ],
        timing: ['BOOTED', 'CHECKED lost'],
      },
    ])
  })
})

describe('thumbjar run with a device check that never completes', () => {
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
        'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out --booted BOOTED',
        'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en.test.ts',
        'adb get-state',
        'adb logcat -d -b crash',
        'adb shell dumpsys activity exit-info com.android.chrome',
        'adb exec-out screencap -p',
      ],
      phases: [
        'http server',
        `tests start, tests/en.test.ts under ${deviceTestFileSeconds(3)} seconds`,
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
        'pnpm exec thumbjar prepare --keyboard en --page-url http://localhost:8765/editor.html --out-dir android/out --booted BOOTED',
        'pnpm exec vitest run --config vitest.android.config.ts --project device tests/en.test.ts',
        'adb get-state',
        'adb logcat -d -b crash',
        'adb shell dumpsys activity exit-info com.android.chrome',
        'adb exec-out screencap -p',
      ],
      phases: [
        'http server',
        `tests start, tests/en.test.ts under ${deviceTestFileSeconds(3)} seconds`,
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
  /** The lines an earlier boot's run left in `phases.log`, as the retry finds them. */
  earlierPhases?: string[]
  prep: number
  /** The PREP FAILED line's reason the fake prep logs to `phases.log`, as `thumbjar prepare` does. */
  prepFailure?: string
  tests: number
  getState: 'device' | 'none' | 'stalled' | 'hung'
}) {
  const directory = mkdtempSync(join(tmpdir(), 'thumbjar-run-'))
  try {
    const bin = join(directory, 'bin')
    const calls = join(directory, 'calls.log')
    deviceTree(directory)
    if (options.earlierPhases !== undefined) {
      mkdirSync(join(directory, 'android/out'))
      writeFileSync(
        join(directory, 'android/out/phases.log'),
        options.earlierPhases
          .map((line) => `PHASE 00:00:00 ${line}\n`)
          .join(''),
      )
    }
    writeFileSync(
      join(bin, 'commands.sh'),
      `#!/usr/bin/env bash
case "$*" in
  "exec thumbjar serve"*) exit 0 ;;
  "exec thumbjar prepare"*)
    echo "pnpm $*" >> ${calls}
    ${options.prepFailure === undefined ? '' : `printf 'PHASE 00:00:00 PREP FAILED: %s\\n' ${shellString(options.prepFailure)} >> android/out/phases.log`}
    exit ${options.prep}
    ;;
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
    chmodSync(join(bin, 'commands.sh'), 0o755)
    chmodSync(join(bin, 'adb'), 0o755)

    const result = spawnSync(
      process.execPath,
      [
        runBootstrap(directory, options),
        'run',
        options.file,
        '--keyboard',
        options.lang,
        '--page-dir',
        'android/dist',
        '--config',
        'vitest.android.config.ts',
        '--project',
        'device',
        '--out-dir',
        'android/out',
      ],
      {
        cwd: directory,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
        },
      },
    )
    const out = join(directory, 'android/out')
    const booted = /^BOOTED at (\d+)$/m.exec(
      readFileSync(join(out, 'timing.txt'), 'utf8'),
    )?.[1]
    return {
      status: result.status,
      calls: existsSync(calls)
        ? readFileSync(calls, 'utf8')
            .trimEnd()
            .split('\n')
            .map((call) =>
              call.replace(` --booted ${booted}`, ' --booted BOOTED'),
            )
        : [],
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
  // The runner's step timeout stops the whole process group, a plain `kill` only the `thumbjar` process.
  kill?: 'group' | 'process'
}) {
  const directory = mkdtempSync(join(tmpdir(), 'thumbjar-run-'))
  try {
    const bin = join(directory, 'bin')
    const calls = join(directory, 'calls.log')
    const stopped = join(directory, 'stopped')
    deviceTree(directory)
    writeFileSync(
      join(bin, 'commands.sh'),
      `#!/usr/bin/env bash
case "$*" in
  "exec thumbjar serve"*) exit 0 ;;
  "exec thumbjar prepare"*) echo "pnpm $*" >> ${calls}; exit 0 ;;
  "exec vitest"*) echo "pnpm $*" >> ${calls}; ${options.stopAt === 'tests' ? `touch ${stopped}; exec sleep ${options.kill === 'process' ? 2 : 60}` : 'exit 1'} ;;
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
    chmodSync(join(bin, 'commands.sh'), 0o755)
    chmodSync(join(bin, 'adb'), 0o755)

    const script = spawn(
      process.execPath,
      [
        runBootstrap(directory, options),
        'run',
        options.file,
        '--keyboard',
        options.lang,
        '--page-dir',
        'android/dist',
        '--config',
        'vitest.android.config.ts',
        '--project',
        'device',
        '--out-dir',
        'android/out',
      ],
      {
        cwd: directory,
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
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
    if (options.kill === 'process') {
      process.kill(script.pid ?? 0, 'SIGTERM')
      await exited
      // A script that outlived its `thumbjar` process would go on once the tests ended.
      await new Promise((resolve) => setTimeout(resolve, 3_500))
    } else {
      // The emulator runner's step timeout kills the script's whole process group.
      process.kill(-(script.pid ?? 0), 'SIGKILL')
      await exited
    }

    const booted = /^BOOTED at (\d+)$/m.exec(
      readFileSync(join(directory, 'android/out/timing.txt'), 'utf8'),
    )?.[1]
    return {
      calls: readFileSync(calls, 'utf8')
        .trimEnd()
        .split('\n')
        .map((call) => call.replace(` --booted ${booted}`, ' --booted BOOTED')),
      timing: readFileSync(join(directory, 'android/out/timing.txt'), 'utf8')
        .trimEnd()
        .split('\n')
        .map((line) => line.replace(/ at \d+$/, '')),
    }
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

function runBootstrap(
  directory: string,
  options: {lang: string; file: string; stopAt?: string},
) {
  const dispatch = join(directory, 'dispatch.mjs')
  const fixture = join(directory, 'bin/commands.sh')
  writeFileSync(
    dispatch,
    `import {spawnSync} from 'node:child_process'
const result = spawnSync('/bin/bash', [${JSON.stringify(fixture)}, 'exec', 'thumbjar', ...process.argv.slice(2)], {stdio: 'inherit'})
process.exit(result.status ?? 1)
`,
  )
  const vitest = join(directory, 'node_modules/vitest')
  mkdirSync(vitest, {recursive: true})
  writeFileSync(
    join(vitest, 'package.json'),
    JSON.stringify({name: 'vitest', bin: './vitest.mjs'}),
  )
  writeFileSync(
    join(vitest, 'vitest.mjs'),
    `import {spawnSync} from 'node:child_process'
const result = spawnSync('/bin/bash', [${JSON.stringify(fixture)}, 'exec', 'vitest', ...process.argv.slice(2)], {stdio: 'inherit'})
process.exit(result.status ?? 1)
`,
  )
  const bootstrap = join(directory, 'run.mjs')
  writeFileSync(
    bootstrap,
    `import {run} from ${JSON.stringify(command)}
import {writeFileSync} from 'node:fs'
import {createServer} from 'node:net'
process.exitCode = await run(${JSON.stringify({file: options.file, keyboard: options.lang, pageDir: 'android/dist', config: 'vitest.android.config.ts', project: 'device', port: '8765', out: 'android/out'})}, {
  command: ${JSON.stringify(dispatch)},
  phase: async (message, write, signal) => {
    if (${JSON.stringify(options.stopAt === 'device check log')} && message.startsWith('device check:')) {
      const hold = createServer().listen(0, '127.0.0.1')
      writeFileSync(${JSON.stringify(join(directory, 'stopped'))}, '')
      try {
        await new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), {once: true}))
      } finally {hold.close()}
    }
    write()
  },
})
`,
  )
  return bootstrap
}

function shellString(text: string) {
  return `'${text.replaceAll("'", "'\\''")}'`
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
  mkdirSync(join(directory, 'bin'))
  mkdirSync(join(directory, 'android/tests'), {recursive: true})
  writeFileSync(join(directory, 'android/tests/empty.test.ts'), '')
  for (const file of ['ja', 'en', 'en-textarea']) {
    writeFileSync(
      join(directory, `android/tests/${file}.test.ts`),
      "test('foo', () => {})\n".repeat(file === 'en-textarea' ? 1 : 3),
    )
  }
}
