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
import {
  deviceTestFileSeconds,
  RUN_TEST_KILL_SECONDS,
  COMMAND_READ_SECONDS,
  COMMAND_KILL_SECONDS,
  DIAGNOSTICS_SECONDS,
} from '../device/budget.ts'

let lastRunExit: number | null = null
// The PREP FAILED line `thumbjar prepare` logs for a real CI boot whose Gboard never loaded the dictionary.
const NEVER_LOADED =
  "Gboard's Japanese dictionary never loaded on this boot: Gboard 15.1.08.726012951-preload-x86_64 logged no `data_loader.cc` `New data is loaded` line for a `mozcdata-<version>.data` file within 360s of boot. It logged `Fallback to minimal engine`, and 2 downloads of `__MOZCPACK_mozcmain_ja_JP` were cancelled. The capture may also lack the line: the main buffer had dropped 2865 of its 9812 lines by the capture's first dump, so the capture may lack lines from boot on, its oldest kept line is from 26.9s after boot, so a load before then would not show. See ja-dictionary.log for the dictionary lines it saw."

const orphanTestCap = 1
const orphanRecorderBound =
  orphanTestCap +
  RUN_TEST_KILL_SECONDS +
  COMMAND_READ_SECONDS +
  COMMAND_KILL_SECONDS +
  DIAGNOSTICS_SECONDS +
  COMMAND_KILL_SECONDS +
  COMMAND_KILL_SECONDS

const orphanTestTimeout = (5 + orphanRecorderBound + 1 + 10) * 1000

test(
  'bounds every stage after the run process group is killed',
  async () => {
    const directory = mkdtempSync(join(tmpdir(), 'thumbjar-orphan-'))
    const pids = join(directory, 'pids')
    const cap = orphanTestCap
    const logcatBound = orphanRecorderBound
    try {
      const bin = join(directory, 'bin')
      mkdirSync(bin)
      const stage = `import {appendFileSync} from 'node:fs'
import {spawn} from 'node:child_process'
import {createServer} from 'node:net'
const kind=process.argv[2]
appendFileSync(${JSON.stringify(pids)},kind+' '+process.pid+'\\n')
if(kind==='prepare') process.exit(0)
if(kind==='vitest') spawn(process.execPath,[${JSON.stringify(join(directory, 'stage.mjs'))},'descendant'],{stdio:'ignore'})
if(kind==='serve')createServer().listen(0,'127.0.0.1')
if(kind!=='serve') process.on('SIGTERM',()=>{})
setInterval(()=>{},1000)
`
      const stageFile = join(directory, 'stage.mjs')
      writeFileSync(stageFile, stage)
      const loader = join(directory, 'loader.mjs')
      writeFileSync(
        loader,
        `import {registerHooks} from 'node:module'
registerHooks({load(url,context,next){if(url.endsWith('/bin.ts') && ['serve','prepare'].includes(process.argv[2]))return {format:'module',shortCircuit:true,source:${JSON.stringify(`await import(${JSON.stringify(stageFile)})`)}};if(url.endsWith('/run/cap.ts'))return {format:'module',shortCircuit:true,source:'process.stdout.write("${cap}")'};return next(url,context)}})
`,
      )
      const vitest = join(directory, 'node_modules/vitest')
      mkdirSync(vitest, {recursive: true})
      writeFileSync(
        join(vitest, 'package.json'),
        JSON.stringify({bin: './vitest.mjs'}),
      )
      writeFileSync(
        join(vitest, 'vitest.mjs'),
        `process.argv[2]='vitest';await import(${JSON.stringify(stageFile)})`,
      )
      writeFileSync(
        join(bin, 'adb'),
        `#!${process.execPath}
const fs=require('node:fs')
if(process.argv.slice(2).join(' ')==='logcat -v time') {fs.appendFileSync(${JSON.stringify(pids)},'logcat '+process.pid+' '+process.ppid+'\\n');setInterval(()=>{},1000)}
`,
      )
      chmodSync(join(bin, 'adb'), 0o755)
      const bootstrap = join(directory, 'run.mjs')
      writeFileSync(
        bootstrap,
        `process.argv=[process.argv[0],${JSON.stringify(fileURLToPath(new URL('../bin.ts', import.meta.url)))},'run','foo','--keyboard','en','--page-dir','.','--config','foo','--project','foo','--out-dir','out'];await import(${JSON.stringify(fileURLToPath(new URL('../bin.ts', import.meta.url)))})
`,
      )
      const child = spawn(process.execPath, ['--import', loader, bootstrap], {
        cwd: directory,
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          NODE_PATH: '',
          THUMBJAR_KEYBOARD: undefined,
          THUMBJAR_OUT_DIR: undefined,
          THUMBJAR_PAGE_URL: undefined,
          THUMBJAR_PAGE_PORT: undefined,
          THUMBJAR_BOOTED: undefined,
          NODE_OPTIONS: `--import=${loader}`,
        },
      })
      await vi.waitFor(
        () =>
          expect(readFileSync(pids, 'utf8').includes('descendant ')).toEqual(
            true,
          ),
        {timeout: 5000},
      )
      const killedAt = Date.now()
      const remaining = (seconds: number) =>
        Math.max(1, killedAt + seconds * 1000 + 1000 - Date.now())
      process.kill(-child.pid!, 'SIGKILL')
      const started = readFileSync(pids, 'utf8')
        .trim()
        .split('\n')
        .map((line) => line.split(' '))
      const serve = started.find(([name]) => name === 'serve')!
      await vi.waitFor(
        () => expect(processAlive(Number(serve[1]))).toEqual(false),
        {timeout: remaining(RUN_TEST_KILL_SECONDS)},
      )
      const stagePids = started
        .filter(
          ([name]) =>
            name === 'vitest' || name === 'descendant' || name === 'serve',
        )
        .map(([, pid]) => Number(pid))
      await vi.waitFor(
        () => expect(stagePids.filter((pid) => processAlive(pid))).toEqual([]),
        {timeout: remaining(cap + RUN_TEST_KILL_SECONDS)},
      )
      const recorder = started.find(([name]) => name === 'logcat')!
      expect(processAlive(Number(recorder[2]))).toEqual(true)
      expect(
        readFileSync(`/proc/${recorder[2]}/cmdline`, 'utf8').includes(
          '/run/logcat.ts',
        ),
      ).toEqual(true)
      await vi.waitFor(
        () => expect(processAlive(Number(recorder[1]))).toEqual(false),
        {timeout: remaining(logcatBound)},
      )
    } finally {
      if (existsSync(pids)) {
        for (const line of readFileSync(pids, 'utf8').trim().split('\n')) {
          const pid = Number(line.split(' ')[1])
          try {
            process.kill(pid, 'SIGKILL')
          } catch {}
        }
      }
      rmSync(directory, {recursive: true, force: true})
    }
  },
  orphanTestTimeout,
)

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

test('logs a missing consumer Vitest and completes the failed-stage diagnostics', () => {
  const result = runOnDevice({
    lang: 'en',
    file: 'tests/en.test.ts',
    prep: 0,
    tests: 0,
    getState: 'device',
    missingVitest: true,
  })
  expect({
    status: result.status,
    phases: result.phases,
    timing: result.timing,
    reason: result.vitestReason,
    diagnostics: result.diagnostics,
  }).toEqual({
    status: 1,
    phases: [
      'http server',
      `tests start, tests/en.test.ts under ${deviceTestFileSeconds(3)} seconds`,
      'tests rc=1',
      'device check: device',
    ],
    timing: ['BOOTED', 'CHECKED device', 'DONE'],
    reason: "Unable to start Vitest: Cannot find module 'vitest/package.json'",
    diagnostics: true,
  })
})

test('returns 1 when run is stopped by SIGTERM', async () => {
  await interruptOnDevice({
    lang: 'en',
    file: 'tests/en.test.ts',
    stopAt: 'tests',
    getState: 'device',
    kill: 'process',
    signal: 'SIGTERM',
  })
  expect(lastRunExit).toEqual(1)
}, 15_000)

test('returns 1 when run is stopped by SIGINT', async () => {
  await interruptOnDevice({
    lang: 'en',
    file: 'tests/en.test.ts',
    stopAt: 'tests',
    getState: 'device',
    kill: 'process',
    signal: 'SIGINT',
  })
  expect(lastRunExit).toEqual(1)
}, 15_000)

function runOnDevice(options: {
  lang: string
  file: string
  /** The lines an earlier boot's run left in `phases.log`, as the retry finds them. */
  earlierPhases?: string[]
  prep: number
  missingVitest?: boolean
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
          NODE_PATH: '',
          THUMBJAR_KEYBOARD: undefined,
          THUMBJAR_OUT_DIR: undefined,
          THUMBJAR_PAGE_URL: undefined,
          THUMBJAR_PAGE_PORT: undefined,
          THUMBJAR_BOOTED: undefined,
          NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${join(directory, 'hooks.mjs')}`,
        },
      },
    )
    const out = join(directory, 'android/out')
    const booted = /^BOOTED at (\d+)$/m.exec(
      readFileSync(join(out, 'timing.txt'), 'utf8'),
    )?.[1]
    return {
      status: result.status,
      ...(options.missingVitest
        ? {
            vitestReason: readFileSync(join(out, 'vitest.log'), 'utf8').split(
              '\n',
            )[0],
            diagnostics: existsSync(join(out, 'final.png')),
          }
        : {}),
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
  signal?: 'SIGTERM' | 'SIGINT'
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
          NODE_PATH: '',
          THUMBJAR_KEYBOARD: undefined,
          THUMBJAR_OUT_DIR: undefined,
          THUMBJAR_PAGE_URL: undefined,
          THUMBJAR_PAGE_PORT: undefined,
          THUMBJAR_BOOTED: undefined,
          NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${join(directory, 'hooks.mjs')}`,
        },
      },
    )
    const exited = new Promise<number | null>((resolve) =>
      script.once('exit', (code) => resolve(code)),
    )
    await vi.waitFor(
      () => {
        expect(existsSync(stopped)).toEqual(true)
      },
      {timeout: 10_000},
    )
    if (options.kill === 'process') {
      process.kill(script.pid ?? 0, options.signal ?? 'SIGTERM')
      lastRunExit = await exited
      // A script that outlived its `thumbjar` process would go on once the tests ended.
      await new Promise((resolve) => setTimeout(resolve, 3_500))
    } else {
      // The emulator runner's step timeout kills the script's whole process group.
      process.kill(-(script.pid ?? 0), 'SIGKILL')
      lastRunExit = await exited
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
  options: {
    lang: string
    file: string
    stopAt?: string
    missingVitest?: boolean
  },
) {
  writeFileSync(
    join(directory, 'environment.mjs'),
    `import {deepStrictEqual} from 'node:assert'
const keys=['THUMBJAR_RUN_CAP','THUMBJAR_RUN_CHECK','THUMBJAR_KEYBOARD','THUMBJAR_OUT_DIR','THUMBJAR_PAGE_URL','THUMBJAR_PAGE_PORT','THUMBJAR_BOOTED']
deepStrictEqual(Object.fromEntries(keys.map(key=>[key,process.env[key]??null])),{
  THUMBJAR_RUN_CAP:${JSON.stringify(fileURLToPath(new URL('cap.ts', import.meta.url)))},
  THUMBJAR_RUN_CHECK:${JSON.stringify(fileURLToPath(new URL('check.ts', import.meta.url)))},
  THUMBJAR_KEYBOARD:null,THUMBJAR_OUT_DIR:null,THUMBJAR_PAGE_URL:null,THUMBJAR_PAGE_PORT:null,THUMBJAR_BOOTED:null
})
`,
  )
  const dispatch = join(directory, 'dispatch.mjs')
  const fixture = join(directory, 'bin/commands.sh')
  writeFileSync(
    dispatch,
    `import ${JSON.stringify(join(directory, 'environment.mjs'))}
import {spawnSync} from 'node:child_process'
import {deepStrictEqual} from 'node:assert'
import {join, relative} from 'node:path'
const args=process.argv.slice(2)
const out=join(process.cwd(),'android/out')
if(args[0]==='serve'){
  deepStrictEqual(args[1],join(process.cwd(),'android/dist'))
  args[1]=relative(process.cwd(),args[1])
}else{
  const index=args.indexOf('--out-dir')+1
  deepStrictEqual(args[index],out)
  args[index]=relative(process.cwd(),args[index])
}
const result = spawnSync('/bin/bash', [${JSON.stringify(fixture)}, 'exec', 'thumbjar', ...args], {stdio: 'inherit'})
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
    `import ${JSON.stringify(join(directory, 'environment.mjs'))}
import {spawnSync} from 'node:child_process'
const result = spawnSync('/bin/bash', [${JSON.stringify(fixture)}, 'exec', 'vitest', ...process.argv.slice(2)], {stdio: 'inherit'})
process.exit(result.status ?? 1)
`,
  )
  if (options.missingVitest) {
    rmSync(vitest, {recursive: true, force: true})
  }
  const main = fileURLToPath(new URL('../bin.ts', import.meta.url))
  const hooks = join(directory, 'hooks.mjs')
  writeFileSync(
    hooks,
    `import {registerHooks} from 'node:module'
registerHooks({load(url,context,next){
  if(url===${JSON.stringify(new URL('../bin.ts', import.meta.url).href)} && ['serve','prepare'].includes(process.argv[2])) return {format:'module',shortCircuit:true,source:${JSON.stringify(`await import(${JSON.stringify(dispatch)})`)}}
  const result=next(url,context)
  if(${JSON.stringify(options.stopAt === 'device check log')} && url.endsWith('/run/check.ts')) return {...result,source:result.source+${JSON.stringify(`
import {createServer as hold} from 'node:net'
import {writeFileSync as mark} from 'node:fs'
hold().listen(0,'127.0.0.1')
mark(${JSON.stringify(join(directory, 'stopped'))},'')
await new Promise(()=>{})
`)}}
  return result
}})
`,
  )
  return main
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

function processAlive(pid: number) {
  try {
    return !/^\d+ \(.*\) Z /.test(readFileSync(`/proc/${pid}/stat`, 'utf8'))
  } catch {
    return false
  }
}
