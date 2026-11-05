import {spawnSync} from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {basename, join} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {deviceTestFileSeconds, prepWorstSeconds} from 'thumbjar/vitest'
import {describe, expect, test} from 'vitest'
import {createVitest} from 'vitest/node'
import {
  BOOT_SECONDS,
  CAP_READ_KILL_SECONDS,
  CAP_READ_SECONDS,
  countDeviceTests,
  DEVICE_CHECK_KILL_SECONDS,
  DEVICE_CHECK_SECONDS,
  DIAGNOSTICS_KILL_SECONDS,
  DIAGNOSTICS_SECONDS,
  JOB_HEADROOM_MINUTES,
  prepSeconds,
  RUN_STEP_HEADROOM_SECONDS,
  runOnDeviceWorstSeconds,
  runStepMinutes,
  TESTS_KILL_SECONDS,
} from './budget.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const deviceFiles = readdirSync(new URL('../tests/', import.meta.url))
  .filter((name) => name.endsWith('.test.ts'))
  .map((name) => `tests/${name}`)
  .sort()
const script = readFileSync(
  new URL('../run-on-device.sh', import.meta.url),
  'utf8',
)
const workflow = readFileSync(
  new URL('../../../../.github/workflows/android-ime.yml', import.meta.url),
  'utf8',
)
// oxfmt wraps a long row over several lines, so each row is read as the flow mapping between its braces.
const rows = [...workflow.matchAll(/^ {10}- \{([^}]*)\}$/gm)].map((match) => {
  const row = Object.fromEntries(
    match[1]!
      .split(',')
      .map((pair) => pair.split(':').map((part) => part.trim()))
      .filter((pair) => pair[0] !== ''),
  )
  return {
    lang: row.lang as 'ja' | 'en',
    file: row.file as string,
    runMinutes: Number(row.run_minutes),
    jobMinutes: Number(row.job_minutes),
  }
})

describe(countDeviceTests.name, () => {
  test('counts top-level tests, failing ones included, and nothing nested or in comments', () => {
    expect(
      countDeviceTests(
        "test('a', () => {})\n// test('b')\ntest.fails('c', () => {\n  test('d')\n})\n",
      ),
    ).toEqual(2)
  })

  test('counts each device test file the way Vitest collects it', async () => {
    const vitest = await createVitest('test', {
      root,
      config: false,
      watch: false,
      include: deviceFiles,
      reporters: [],
    })
    try {
      const {testModules} = await vitest.collect()

      expect(
        Object.fromEntries(
          deviceFiles.map((file) => [
            file,
            countDeviceTests(readFileSync(`${root}${file}`, 'utf8')),
          ]),
        ),
      ).toEqual(
        Object.fromEntries(
          testModules.map((testModule) => [
            testModule.relativeModuleId,
            [...testModule.children.allTests()].length,
          ]),
        ),
      )
    } finally {
      await vitest.close()
    }
  }, 30_000)
})

describe(runOnDeviceWorstSeconds.name, () => {
  test("takes each keyboard's prep cap from thumbjar's, so a prep that grows grows its run step", () => {
    expect({
      ja: {prep: prepSeconds('ja'), thumbjar: prepWorstSeconds('ja')},
      en: {prep: prepSeconds('en'), thumbjar: prepWorstSeconds('en')},
    }).toEqual({
      ja: {prep: 889, thumbjar: 889},
      en: {prep: 632, thumbjar: 632},
    })
  })

  test('a Japanese file of three tests is capped at 1735 seconds and its script ends within 2729, an English one within 2472, and a file of two within 2184 and 1927', () => {
    expect({
      threeTests: {
        tests: deviceTestFileSeconds(3),
        ja: runOnDeviceWorstSeconds('ja', 3),
        en: runOnDeviceWorstSeconds('en', 3),
      },
      twoTests: {
        tests: deviceTestFileSeconds(2),
        ja: runOnDeviceWorstSeconds('ja', 2),
        en: runOnDeviceWorstSeconds('en', 2),
      },
    }).toEqual({
      threeTests: {tests: 1735, ja: 2729, en: 2472},
      twoTests: {tests: 1190, ja: 2184, en: 1927},
    })
  })

  test('sums the caps `run-on-device.sh` runs its stages under', () => {
    expect({
      capRead:
        /^tests_seconds=\$\(timeout -k (\d+) (\d+) node android\/scripts\/budget\.mjs "android\/\$file"\)$/m
          .exec(script)
          ?.slice(1)
          .map(Number),
      tests:
        /^timeout -k (\d+) "\$tests_seconds" pnpm exec vitest run --config vitest\.android\.config\.ts --project device "\$file" /m
          .exec(script)
          ?.slice(1)
          .map(Number),
      deviceCheck:
        /timeout -k (\d+) (\d+) node android\/scripts\/emulator-runs\.mjs device-state /
          .exec(script)
          ?.slice(1)
          .map(Number),
      diagnostics:
        /^timeout -k (\d+) (\d+) bash -c '\n\s+adb logcat -d -b crash/m
          .exec(script)
          ?.slice(1)
          .map(Number),
    }).toEqual({
      capRead: [CAP_READ_KILL_SECONDS, CAP_READ_SECONDS],
      tests: [TESTS_KILL_SECONDS],
      deviceCheck: [DEVICE_CHECK_KILL_SECONDS, DEVICE_CHECK_SECONDS],
      diagnostics: [DIAGNOSTICS_KILL_SECONDS, DIAGNOSTICS_SECONDS],
    })
  })
})

describe(runStepMinutes.name, () => {
  test('leaves a minute of headroom past the boot, the script and the runner allowance, for the action, shell and pnpm startup no cap counts', () => {
    expect({
      headroom: RUN_STEP_HEADROOM_SECONDS,
      ja: {
        minutes: runStepMinutes('ja', 3),
        spare:
          runStepMinutes('ja', 3) * 60 -
          (BOOT_SECONDS + runOnDeviceWorstSeconds('ja', 3) + 180),
      },
      en: {
        minutes: runStepMinutes('en', 3),
        spare:
          runStepMinutes('en', 3) * 60 -
          (BOOT_SECONDS + runOnDeviceWorstSeconds('en', 3) + 180),
      },
    }).toEqual({
      headroom: 60,
      ja: {minutes: 56, spare: 91},
      en: {minutes: 52, spare: 108},
    })
  })
})

describe('budget.mjs imported from an entry `node` cannot resolve', () => {
  test('imports without running its command, from stdin and from an entry path that does not exist', () => {
    expect([
      importFromEntry(
        fileURLToPath(new URL('budget.mjs', import.meta.url)),
        '-',
      ),
      importFromEntry(
        fileURLToPath(new URL('budget.mjs', import.meta.url)),
        'missing',
      ),
    ]).toEqual([
      {status: 0, stdout: 'imported\n', stderr: ''},
      {status: 0, stdout: 'imported\n', stderr: ''},
    ])
  })
})

describe('budget.mjs run as `node`’s entry whose file is removed once loaded', () => {
  test('still runs its command, with `import.meta.main` and with the fallback for Node without it', () => {
    expect([
      runRemovedAfterLoad(
        fileURLToPath(new URL('budget.mjs', import.meta.url)),
        [`${root}tests/ja.test.ts`],
        'native',
      ),
      runRemovedAfterLoad(
        fileURLToPath(new URL('budget.mjs', import.meta.url)),
        [`${root}tests/ja.test.ts`],
        'removed',
      ),
    ]).toEqual([
      {status: 0, stdout: '1735\n', stderr: '', removed: true},
      {status: 0, stdout: '1735\n', stderr: '', removed: true},
    ])
  })
})

describe('the workflow', () => {
  const fixedStepMinutes = [
    ...workflow.matchAll(/^ {8}timeout-minutes: (\d+)$/gm),
  ].map((match) => Number(match[1]))
  const runStepCaps = [
    ...workflow.matchAll(
      /^ {8}timeout-minutes: (.+)\n(?: {8}.*\n)*? {8}uses: reactivecircus\/android-emulator-runner/gm,
    ),
  ].map((match) => match[1])
  const jobCap = /^ {4}timeout-minutes: (.+)$/m.exec(workflow)?.[1]

  test('runs `ja.test.ts` and `en.test.ts` in a job each, on a device prepared for the language the file is named after', () => {
    expect(rows.map(({lang, file}) => ({lang, file}))).toEqual([
      {lang: 'ja', file: 'tests/ja.test.ts'},
      {lang: 'en', file: 'tests/en.test.ts'},
    ])
  })

  test('leaves out only the hand-run `textarea` control', () => {
    expect(
      deviceFiles.filter((file) => !rows.some((row) => row.file === file)),
    ).toEqual(['tests/en-textarea.test.ts'])
  })

  test('names each job and its artifact after its file, and runs the file it names', () => {
    expect({
      job: /^ {4}name: (.*)$/m.exec(workflow)?.[1],
      suiteName: /^ {8}run: (echo "name=.*)$/m.exec(workflow)?.[1],
      artifact: /^ {10}name: (android-ime-.*)$/m.exec(workflow)?.[1],
      scripts: [...workflow.matchAll(/^ {10}script: (.*)$/gm)].map(
        (match) => match[1],
      ),
      languages: [...workflow.matchAll(/^ {10}IME_LANG: (.*)$/gm)].map(
        (match) => match[1],
      ),
    }).toEqual({
      job: 'Android IME (${{ matrix.suite.file }})',
      suiteName: `echo "name=$(basename '\${{ matrix.suite.file }}' .test.ts)" >> "$GITHUB_OUTPUT"`,
      artifact:
        'android-ime-${{ steps.suite.outputs.name }}-api${{ matrix.api }}-${{ github.run_attempt }}',
      scripts: [
        'android/run-on-device.sh ${{ matrix.suite.file }}',
        'android/run-on-device.sh ${{ matrix.suite.file }}',
      ],
      languages: ['${{ matrix.suite.lang }}', '${{ matrix.suite.lang }}'],
    })
  })

  test("boots each run step's emulator within `BOOT_SECONDS`", () => {
    expect(
      [...workflow.matchAll(/^ {10}emulator-boot-timeout: (\d+)$/gm)].map(
        (match) => Number(match[1]),
      ),
    ).toEqual([BOOT_SECONDS, BOOT_SECONDS])
  })

  test("caps each run step and the job at its own row's minutes", () => {
    expect({runStepCaps, jobCap}).toEqual({
      runStepCaps: [
        '${{ matrix.suite.run_minutes }}',
        '${{ matrix.suite.run_minutes }}',
      ],
      jobCap: '${{ matrix.suite.job_minutes }}',
    })
  })

  test("gives each row's run steps the boot, the script on its file for its keyboard, the runner allowance and the headroom, rounded up to a minute", () => {
    expect(rows.map((row) => row.runMinutes)).toEqual(
      rows.map((row) =>
        runStepMinutes(
          row.lang,
          countDeviceTests(readFileSync(`${root}${row.file}`, 'utf8')),
        ),
      ),
    )
  })

  test("allows each row's job its fixed step caps, its two run steps and a minute for the Result step to run", () => {
    expect(rows.map((row) => row.jobMinutes)).toEqual(
      rows.map(
        (row) =>
          fixedStepMinutes.reduce((sum, minutes) => sum + minutes, 0) +
          2 * row.runMinutes +
          JOB_HEADROOM_MINUTES,
      ),
    )
  })

  test('caps the Japanese run steps at 56 minutes and its job at 169, the English run steps at 52 and its job at 161', () => {
    expect(
      rows.map(({lang, runMinutes, jobMinutes}) => ({
        lang,
        runMinutes,
        jobMinutes,
      })),
    ).toEqual([
      {lang: 'ja', runMinutes: 56, jobMinutes: 169},
      {lang: 'en', runMinutes: 52, jobMinutes: 161},
    ])
  })
})

function importFromEntry(script: string, entry: '-' | 'missing') {
  const result = spawnSync('node', ['--input-type=module', '-'], {
    encoding: 'utf8',
    input: [
      'if (process.env.ENTRY) process.argv[1] = process.env.ENTRY',
      'await import(process.env.SCRIPT)',
      "console.log('imported')",
    ].join('\n'),
    env: {
      ...process.env,
      SCRIPT: pathToFileURL(script).href,
      ENTRY: entry === 'missing' ? join(tmpdir(), 'no-such-entry.mjs') : '',
    },
  })
  return {status: result.status, stdout: result.stdout, stderr: result.stderr}
}

function runRemovedAfterLoad(
  script: string,
  args: string[],
  mainFlag: 'native' | 'removed',
) {
  const directory = mkdtempSync(join(tmpdir(), 'removed-after-load-'))
  try {
    const entry = join(directory, basename(script))
    copyFileSync(script, entry)
    symlinkSync(join(root, '../node_modules'), join(directory, 'node_modules'))
    // Removes the entry once Node has read it, and with `removed` takes away `import.meta.main`, so Node
    // 24 runs the fallback Node 22 has.
    writeFileSync(
      join(directory, 'hooks.mjs'),
      [
        "import {unlinkSync} from 'node:fs'",
        'export function load(url, context, nextLoad) {',
        '  const result = nextLoad(url, context)',
        '  return result instanceof Promise',
        '    ? result.then((loaded) => afterLoad(url, loaded))',
        '    : afterLoad(url, result)',
        '}',
        'function afterLoad(url, result) {',
        '  if (url !== process.env.ENTRY_URL) return result',
        '  unlinkSync(new URL(url))',
        "  if (process.env.MAIN_FLAG !== 'removed') return result",
        '  return {...result, source: `delete import.meta.main\\n${result.source}`}',
        '}',
      ].join('\n'),
    )
    writeFileSync(
      join(directory, 'register.mjs'),
      // `module.register()` is deprecated from Node 26 and warns on stderr, and Node 22.12 has no
      // `module.registerHooks()`.
      [
        "import * as module from 'node:module'",
        "import {load} from './hooks.mjs'",
        'if (module.registerHooks) module.registerHooks({load})',
        "else module.register('./hooks.mjs', import.meta.url)",
      ].join('\n'),
    )
    const result = spawnSync(
      'node',
      [
        '--import',
        pathToFileURL(join(directory, 'register.mjs')).href,
        entry,
        ...args,
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          ENTRY_URL: pathToFileURL(entry).href,
          MAIN_FLAG: mainFlag,
        },
      },
    )
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
      removed: !existsSync(entry),
    }
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}
