import {mkdtempSync, readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, test, vi} from 'vitest'
import {runSuite} from './fixtures/run-suite.ts'

describe('the Japanese device tests', () => {
  test('passes every case when Gboard commits a word as kana', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/typing-commits-kana-then-kanji.ts',
        ],
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Typing kyou twice into a plain contenteditable',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice into an empty block',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice after existing text',
          state: 'passed',
        },
      ],
    })
  }, 30_000)

  test('fails every case when the text is right but the page recorded no composition', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/typing-records-no-composition.ts',
        ],
      }),
    ).toEqual({
      file: 'failed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Typing kyou twice into a plain contenteditable',
          state: 'failed',
        },
        {
          name: 'Scenario: Typing kyou twice into an empty block',
          state: 'failed',
        },
        {
          name: 'Scenario: Typing kyou twice after existing text',
          state: 'failed',
        },
      ],
    })
  }, 30_000)
})

describe('the shipped composition tests through a retry', () => {
  // Faults of the pid reads and the relaunch in the Chrome restart of a call with a `crash`. A call without
  // one reads no pid, so each still retries in a Chrome the force-stop stopped and types every word.
  const FAULTS = [
    'pid-error',
    'pid-timeout',
    'pid-empty',
    'restart-survives',
    'relaunch-none',
    'relaunch-old',
    'slow-pid-success',
  ] as const

  test.each(FAULTS)(
    'retry every case of `tests/en.test.ts` and pass it with %s',
    async (fault) => {
      const callsFile = join(
        mkdtempSync(join(tmpdir(), 'android-ime-')),
        'calls.jsonl',
      )
      vi.stubEnv('IME_CALLS_FILE', callsFile)
      let result: Awaited<ReturnType<typeof runSuite>>
      try {
        result = await runSuite({
          file: 'tests/en.test.ts',
          setupFiles: [
            'scripts/fixtures/suites/gboard-with-layouts.ts',
            'scripts/fixtures/suites/shipped-retry-faults.ts',
            'tests/setup.ts',
          ],
          testTimeout: 60_000,
          provide: {shippedFault: fault},
        })
      } finally {
        vi.unstubAllEnvs()
      }

      const call = {
        state: 'complete',
        retries: 1,
        taps: [
          ['K'],
          ['K', 'Y', 'O', 'U', 'Space', 'K', 'Y', 'O', 'U', 'Space'],
        ],
        chrome: ['force-stop', 'force-stop'],
      }
      expect({
        result,
        calls: readFileSync(callsFile, 'utf8')
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line)),
      }).toEqual({
        result: {
          file: 'passed',
          errors: [],
          tests: [
            {
              name: 'Scenario: Typing kyou twice into a plain contenteditable',
              state: 'passed',
            },
            {
              name: 'Scenario: Typing kyou twice into an empty block',
              state: 'passed',
            },
            {
              name: 'Scenario: Typing kyou twice after existing text',
              state: 'passed',
            },
          ],
        },
        calls: [
          {
            test: 'Scenario: Typing kyou twice into a plain contenteditable',
            ...call,
          },
          {test: 'Scenario: Typing kyou twice into an empty block', ...call},
          {test: 'Scenario: Typing kyou twice after existing text', ...call},
        ],
      })
    },
    60_000,
  )

  test.each(FAULTS)(
    'retry every case of `tests/ja.test.ts` and pass it with %s',
    async (fault) => {
      const callsFile = join(
        mkdtempSync(join(tmpdir(), 'android-ime-')),
        'calls.jsonl',
      )
      vi.stubEnv('IME_CALLS_FILE', callsFile)
      let result: Awaited<ReturnType<typeof runSuite>>
      try {
        result = await runSuite({
          file: 'tests/ja.test.ts',
          setupFiles: [
            'scripts/fixtures/suites/gboard-with-layouts.ts',
            'scripts/fixtures/suites/shipped-retry-faults.ts',
            'tests/setup.ts',
          ],
          testTimeout: 60_000,
          provide: {shippedFault: fault},
        })
      } finally {
        vi.unstubAllEnvs()
      }

      const call = {
        state: 'complete',
        retries: 1,
        taps: [['k'], ['k', 'y', 'o', 'u', '今日', 'k', 'y', 'o', 'u', '今日']],
        chrome: ['force-stop', 'force-stop'],
      }
      expect({
        result,
        calls: readFileSync(callsFile, 'utf8')
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line)),
      }).toEqual({
        result: {
          file: 'passed',
          errors: [],
          tests: [
            {
              name: 'Scenario: Typing kyou twice into a plain contenteditable',
              state: 'passed',
            },
            {
              name: 'Scenario: Typing kyou twice into an empty block',
              state: 'passed',
            },
            {
              name: 'Scenario: Typing kyou twice after existing text',
              state: 'passed',
            },
          ],
        },
        calls: [
          {
            test: 'Scenario: Typing kyou twice into a plain contenteditable',
            ...call,
          },
          {test: 'Scenario: Typing kyou twice into an empty block', ...call},
          {test: 'Scenario: Typing kyou twice after existing text', ...call},
        ],
      })
    },
    60_000,
  )
})

const CRASH_SETUP = [
  'scripts/fixtures/suites/gboard-with-layouts.ts',
  'scripts/fixtures/suites/crash-page.ts',
  'scripts/fixtures/suites/every-test-fails.ts',
  'tests/setup.ts',
]

const TEST_FAILS =
  'These tests are marked `test.fails`, which counts any error as the expected failure, so they say nothing about the editor.'

const INPUT_SENT =
  'and input the attempt sent may still reach the page, so a read without errors after it is no result'

const NO_FRESH_CHROME =
  'Inconclusive: the driver faulted and the restart before its retry did not show a fresh Chrome, so the retry did not run. This is not a crash reproduction and not an editor failure. Rerun the job. ChromeNotRestarted:'

const DEVICE_OFFLINE =
  'Inconclusive: the device went offline (adb: offline) before the retry, so this run cannot tell whether the editor crashed. This is not a crash reproduction and not an editor failure. Rerun the job. ChromeNotRestarted:'

const INCONCLUSIVE =
  'Inconclusive: the driver faulted after typing started, so this run cannot tell whether the editor crashed. This is not a crash reproduction and not an editor failure. Rerun the job. The fault:'

const CRASH = "/^NotFoundError: Failed to execute 'removeChild' on 'Node'/"

const REMOVE_CHILD =
  "NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."

describe('the ja.crashes tests', () => {
  test('pass every case on the page in jsdom, which shows each decoration and, for きょう, its removal', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: ['scripts/fixtures/suites/page-in-jsdom.ts'],
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail every case on the page in jsdom on the mounted decoration once the editable gets no rangeDecorations, though the page still logs its ranges', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/page-in-jsdom.ts',
          'scripts/fixtures/suites/failure-messages.ts',
        ],
        provide: {jsdomEditableWithoutRangeDecorations: true},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        "Scenario: Typing kyou twice while each 今日 is decorated as it is committed: no decoration over '今日' mounted by the commit | Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it: no decoration over 'きょう' mounted inside the composition",
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'failed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'failed',
        },
      ],
    })
  }, 30_000)
  test('pass every case marked test.fails when the page records the removeChild error on the last commit', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {crash: 'on the last commit'}},
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('report every case marked test.fails as unexpectedly passing when the page records no error', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'failed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'failed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when Gboard composed nothing', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {missing: 'composition'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing kyou twice while each 今日 is decorated as it is committed": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: no composition was open, ${INPUT_SENT}. In "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: no composition was open, ${INPUT_SENT}. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when no decoration mounted', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {missing: 'decoration'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing kyou twice while each 今日 is decorated as it is committed": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: no commit handed the editor decoration ranges after the commit's tap, ${INPUT_SENT}. In "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: no commit added a decoration range over 'きょう' inside the composition, ${INPUT_SENT}. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of the きょう case marked test.fails when its decoration stays mounted through the conversion', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {missing: 'decoration removal'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": ${INCONCLUSIVE} Error: word 2 did not reach the case's mechanism: a decoration over 'きょう' was still mounted after the commit, ${INPUT_SENT}. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'failed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when Gboard offers another candidate', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {missing: 'candidate'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing kyou twice while each 今日 is decorated as it is committed": ${INCONCLUSIVE} Error: required candidate '今日' not offered for word 1, candidates ['設定', '手書き入力', '長音記号', '削除', '読点', '次の言語', 'スペース', '句点', '左', '右', '京'], ${INPUT_SENT}. In "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": ${INCONCLUSIVE} Error: required candidate '今日' not offered for word 2, candidates ['設定', '手書き入力', '長音記号', '削除', '読点', '次の言語', 'スペース', '句点', '左', '右', '京'], ${INPUT_SENT}. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the page records the removeChild error before the last commit', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {crash: 'before the last commit'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Typing kyou twice while each 今日 is decorated as it is committed": Error: word 2 did not reach the case's mechanism: the page recorded errors at the letters, which is not the case's trigger: ["${REMOVE_CHILD}"], and the page recorded errors: ["${REMOVE_CHILD}"], "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": Error: word 2 did not reach the case's mechanism: the page recorded errors at the letters, which is not the case's trigger: ["${REMOVE_CHILD}"], and the page recorded errors: ["${REMOVE_CHILD}"]. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the page also records an error other than removeChild', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {
            crash: 'on the last commit',
            error: 'TypeError: unrelated page failure',
          },
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Typing kyou twice while each 今日 is decorated as it is committed": Error: no error but the case's crash ${CRASH} was expected, and the page recorded errors: ['TypeError: unrelated page failure'], "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": Error: no error but the case's crash ${CRASH} was expected, and the page recorded errors: ['TypeError: unrelated page failure']. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the page records the removeChild error on the last commit but no decoration range was committed or mounted', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {crash: 'on the last commit', missing: 'decoration'},
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing kyou twice while each 今日 is decorated as it is committed": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: no commit handed the editor decoration ranges after the commit's tap, ${INPUT_SENT}. In "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: no commit added a decoration range over 'きょう' inside the composition, ${INPUT_SENT}. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the page records the removeChild error on the last commit but no commit handed the editor decoration ranges after its candidate tap', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {crash: 'on the last commit', missing: 'last commit'},
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Typing kyou twice while each 今日 is decorated as it is committed": Error: word 2 did not reach the case's mechanism: no commit handed the editor decoration ranges after the commit's tap, and the page recorded errors: ["${REMOVE_CHILD}"], "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": Error: word 2 did not reach the case's mechanism: no commit handed the editor decoration ranges after the commit's tap, and the page recorded errors: ["${REMOVE_CHILD}"]. These tests are marked \`test.fails\`, which counts any error as the expected failure, so they say nothing about the editor.`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of the きょう case marked test.fails when the page records the removeChild error on the last commit but the last commit after its candidate tap kept the kana range', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {crash: 'on the last commit', missing: 'kana range drop'},
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": Error: word 2 did not reach the case's mechanism: the last commit after the commit's tap still handed the editor a range over 'きょう', and the page recorded errors: ["${REMOVE_CHILD}"]. These tests are marked \`test.fails\`, which counts any error as the expected failure, so they say nothing about the editor.`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the page records the removeChild error on the commit of the first word', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {crash: 'on the first commit'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Typing kyou twice while each 今日 is decorated as it is committed": Error: word 1 did not reach the case's mechanism: the page recorded errors at the commit, which is not the case's trigger: ["${REMOVE_CHILD}"], and the page recorded errors: ["${REMOVE_CHILD}"], "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": Error: word 1 did not reach the case's mechanism: the page recorded errors at the commit, which is not the case's trigger: ["${REMOVE_CHILD}"], and the page recorded errors: ["${REMOVE_CHILD}"]. These tests are marked \`test.fails\`, which counts any error as the expected failure, so they say nothing about the editor.`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when no commit handed the editor decoration ranges after the last candidate tap', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {missing: 'last commit'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing kyou twice while each 今日 is decorated as it is committed": ${INCONCLUSIVE} Error: word 2 did not reach the case's mechanism: no commit handed the editor decoration ranges after the commit's tap, ${INPUT_SENT}. In "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": ${INCONCLUSIVE} Error: word 2 did not reach the case's mechanism: no commit handed the editor decoration ranges after the commit's tap, ${INPUT_SENT}. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of the きょう case marked test.fails when the last commit after the last candidate tap kept the kana range', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {missing: 'kana range drop'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": ${INCONCLUSIVE} Error: word 2 did not reach the case's mechanism: the last commit after the commit's tap still handed the editor a range over 'きょう', ${INPUT_SENT}. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'failed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the page records the removeChild error on the last commit but React superseded the render with the new ranges by one with the old ranges', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {crash: 'on the last commit', render: 'superseded'},
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Typing kyou twice while each 今日 is decorated as it is committed": Error: word 2 did not reach the case's mechanism: the last commit after the commit's tap added no decoration range over '今日', and the page recorded errors: ["${REMOVE_CHILD}"], "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": Error: word 2 did not reach the case's mechanism: the last commit after the commit's tap still handed the editor a range over 'きょう', and the page recorded errors: ["${REMOVE_CHILD}"]. These tests are marked \`test.fails\`, which counts any error as the expected failure, so they say nothing about the editor.`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the page records the removeChild error on the last commit but React abandoned the render with the new ranges', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {crash: 'on the last commit', render: 'abandoned'},
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Typing kyou twice while each 今日 is decorated as it is committed": Error: word 2 did not reach the case's mechanism: no commit handed the editor decoration ranges after the commit's tap, and the page recorded errors: ["${REMOVE_CHILD}"], "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": Error: word 2 did not reach the case's mechanism: no commit handed the editor decoration ranges after the commit's tap, and the page recorded errors: ["${REMOVE_CHILD}"]. These tests are marked \`test.fails\`, which counts any error as the expected failure, so they say nothing about the editor.`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('pass the きょう case marked test.fails when Gboard offers no candidate for the first word, which Space commits as kana, and the page records the removeChild error on the last commit, while the 今日 case faults', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {crash: 'on the last commit', kanaFirstWord: true},
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing kyou twice while each 今日 is decorated as it is committed": ${INCONCLUSIVE} Error: required candidate '今日' not offered for word 1, candidates ['設定', '手書き入力', '長音記号', '削除', '読点', '次の言語', 'スペース', '句点', '左', '右'], ${INPUT_SENT}. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('report the きょう case marked test.fails as unexpectedly passing when Space commits the first word as kana and the page records no error', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {kanaFirstWord: true}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing kyou twice while each 今日 is decorated as it is committed": ${INCONCLUSIVE} Error: required candidate '今日' not offered for word 1, candidates ['設定', '手書き入力', '長音記号', '削除', '読点', '次の言語', 'スペース', '句点', '左', '右'], ${INPUT_SENT}. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'failed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of the きょう case marked test.fails when Space commits the first word as kana and the decoration of the second word stays mounted through the conversion', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {kanaFirstWord: true, missing: 'decoration removal'},
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing kyou twice while each 今日 is decorated as it is committed": ${INCONCLUSIVE} Error: required candidate '今日' not offered for word 1, candidates ['設定', '手書き入力', '長音記号', '削除', '読点', '次の言語', 'スペース', '句点', '左', '右'], ${INPUT_SENT}. In "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": ${INCONCLUSIVE} Error: word 2 did not reach the case's mechanism: a decoration over 'きょう' was still mounted after the commit, ${INPUT_SENT}. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of the きょう case marked test.fails when Space commits the first word as kana and the last commit after the tap of the second word kept its kana range with the removeChild error', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {
            crash: 'on the last commit',
            kanaFirstWord: true,
            missing: 'kana range drop',
          },
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing kyou twice while each 今日 is decorated as it is committed": ${INCONCLUSIVE} Error: required candidate '今日' not offered for word 1, candidates ['設定', '手書き入力', '長音記号', '削除', '読点', '次の言語', 'スペース', '句点', '左', '右'], ${INPUT_SENT}. The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it": Error: word 2 did not reach the case's mechanism: the last commit after the commit's tap still handed the editor a range over 'きょう', and the page recorded errors: ["${REMOVE_CHILD}"]. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
})

const COMPOSED =
  'English Gboard composed, so this control run no longer controls for composition: expected { compositionstart:'

const EN_CRASHES = [
  'Scenario: Typing kyou twice while each you is decorated as it completes',
  'Scenario: Typing u after yo wraps every character the block held in a decoration',
]

describe('the en.crashes tests', () => {
  test('pass every case on the page in jsdom, where each you range is committed without a composition', async () => {
    expect(
      await runSuite({
        file: 'tests/en.crashes.test.ts',
        setupFiles: ['scripts/fixtures/suites/page-in-jsdom.ts'],
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {name: EN_CRASHES[0], state: 'passed'},
        {name: EN_CRASHES[1], state: 'passed'},
      ],
    })
  }, 30_000)
  test('fail every case on the page in jsdom on the committed ranges once the page decorates nothing', async () => {
    expect(
      await runSuite({
        file: 'tests/en.crashes.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/page-in-jsdom.ts',
          'scripts/fixtures/suites/failure-messages.ts',
        ],
        provide: {jsdomPageWithoutDecorations: true},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `${EN_CRASHES[0]}: no commit added a decoration range over 'you' | ${EN_CRASHES[1]}: no commit added a decoration range over 'you'`,
      ],
      tests: [
        {name: EN_CRASHES[0], state: 'failed'},
        {name: EN_CRASHES[1], state: 'failed'},
      ],
    })
  }, 30_000)
  test('fail every case on the page in jsdom on the mounted decoration once the editable gets no rangeDecorations, though the page still logs its ranges', async () => {
    expect(
      await runSuite({
        file: 'tests/en.crashes.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/page-in-jsdom.ts',
          'scripts/fixtures/suites/failure-messages.ts',
        ],
        provide: {jsdomEditableWithoutRangeDecorations: true},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `${EN_CRASHES[0]}: no decoration over 'you' mounted | ${EN_CRASHES[1]}: no decoration over 'you' mounted`,
      ],
      tests: [
        {name: EN_CRASHES[0], state: 'failed'},
        {name: EN_CRASHES[1], state: 'failed'},
      ],
    })
  }, 30_000)
  test('fail every case on the page in jsdom, saying English Gboard composed, once each word is typed inside a composition', async () => {
    expect(
      await runSuite({
        file: 'tests/en.crashes.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/page-in-jsdom.ts',
          'scripts/fixtures/suites/failure-messages.ts',
        ],
        provide: {jsdomEnglishComposes: true},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `${EN_CRASHES[0]}: ${COMPOSED} 2, …(1) } to deeply equal { compositionstart: +0, …(1) } | ${EN_CRASHES[1]}: ${COMPOSED} 1, …(1) } to deeply equal { compositionstart: +0, …(1) }`,
      ],
      tests: [
        {name: EN_CRASHES[0], state: 'failed'},
        {name: EN_CRASHES[1], state: 'failed'},
      ],
    })
  }, 30_000)
})

const EN_CRASHES_SETUP = [
  'scripts/fixtures/suites/gboard-with-layouts.ts',
  'scripts/fixtures/suites/english-decoration-page.ts',
  'scripts/fixtures/suites/failure-messages.ts',
  'tests/setup.ts',
]

describe('the en.crashes tests through the driver', () => {
  test('pass every case on the fake Gboard when each you range is committed without a composition', async () => {
    expect(
      await runSuite({
        file: 'tests/en.crashes.test.ts',
        setupFiles: EN_CRASHES_SETUP,
        provide: {englishPage: {}},
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {name: EN_CRASHES[0], state: 'passed'},
        {name: EN_CRASHES[1], state: 'passed'},
      ],
    })
  }, 30_000)
  test('fail every case on the fake Gboard on the committed ranges when the page decorates nothing', async () => {
    expect(
      await runSuite({
        file: 'tests/en.crashes.test.ts',
        setupFiles: EN_CRASHES_SETUP,
        provide: {englishPage: {undecorated: true}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `${EN_CRASHES[0]}: ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: no commit added a decoration range over 'you', ${INPUT_SENT} | ${EN_CRASHES[1]}: ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: no commit added a decoration range over 'you', ${INPUT_SENT}`,
      ],
      tests: [
        {name: EN_CRASHES[0], state: 'failed'},
        {name: EN_CRASHES[1], state: 'failed'},
      ],
    })
  }, 30_000)
  test('fail every case on the fake Gboard on the mounted decoration when the page logs its ranges but hands the editor none', async () => {
    expect(
      await runSuite({
        file: 'tests/en.crashes.test.ts',
        setupFiles: EN_CRASHES_SETUP,
        provide: {englishPage: {undelivered: true}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `${EN_CRASHES[0]}: ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: no decoration over 'you' mounted, ${INPUT_SENT} | ${EN_CRASHES[1]}: ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: no decoration over 'you' mounted, ${INPUT_SENT}`,
      ],
      tests: [
        {name: EN_CRASHES[0], state: 'failed'},
        {name: EN_CRASHES[1], state: 'failed'},
      ],
    })
  }, 30_000)
  test('fail every case on the fake Gboard, saying English Gboard composed, when Gboard composes each word', async () => {
    expect(
      await runSuite({
        file: 'tests/en.crashes.test.ts',
        setupFiles: EN_CRASHES_SETUP,
        provide: {englishPage: {composes: true}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `${EN_CRASHES[0]}: ${COMPOSED} 2, …(1) } to deeply equal { compositionstart: +0, …(1) } | ${EN_CRASHES[1]}: ${COMPOSED} 1, …(1) } to deeply equal { compositionstart: +0, …(1) }`,
      ],
      tests: [
        {name: EN_CRASHES[0], state: 'failed'},
        {name: EN_CRASHES[1], state: 'failed'},
      ],
    })
  }, 30_000)
})

describe('the en.crashes tests with the final read 176.5 seconds into the attempt', () => {
  // On 0e5de5d75, which reads nothing around a Space, both cases complete: without errors on a clean
  // page, and with the page's crash when it records one with the trigger.
  const base = (crash: boolean) =>
    EN_CRASHES.map((test) => ({
      test,
      state: 'complete',
      errors: crash ? [REMOVE_CHILD] : [],
    }))

  for (const fault of [
    'none',
    'last-dump-hangs',
    'last-dump-fails',
    'clock-hangs',
    'clock-fails',
    'logcat-hangs',
    'logcat-fails',
  ] as const) {
    for (const crash of [false, true]) {
      test(`end as on a driver without the Space check, ${crash ? "with the page's crash" : 'on a clean page'}, when the reads after it ${fault === 'none' ? 'answer' : fault.replaceAll('-', ' ')}`, async () => {
        const runs = join(
          mkdtempSync(join(tmpdir(), 'android-ime-')),
          'runs.jsonl',
        )
        await runSuite({
          file: 'tests/en.crashes.test.ts',
          setupFiles: [
            'scripts/fixtures/suites/gboard-with-layouts.ts',
            'scripts/fixtures/suites/space-check-at-deadline.ts',
            'tests/setup.ts',
          ],
          testTimeout: 30_000,
          provide: {spaceCheckAtDeadline: {fault, crash, runs}},
        })

        expect(
          readFileSync(runs, 'utf8')
            .split('\n')
            .filter((line) => line !== '')
            .map((line) => JSON.parse(line)),
        ).toEqual(base(crash))
      }, 60_000)
    }
  }
})

describe('the ja.enter tests', () => {
  test('pass every case on the page in jsdom, on the desktop input path, where the Behavior deletes the dash on Enter', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.enter.test.ts',
        setupFiles: ['scripts/fixtures/suites/page-in-jsdom.ts'],
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail every case on the page in jsdom, on the desktop input path, once the page registers no Behavior', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.enter.test.ts',
        setupFiles: ['scripts/fixtures/suites/page-in-jsdom.ts'],
        provide: {jsdomPageWithoutBehavior: true},
      }),
    ).toEqual({
      file: 'failed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'failed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'failed',
        },
      ],
    })
  }, 30_000)
  test('pass every case marked test.fails when the page records the removeChild error on Enter', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {crash: 'on the last commit'}},
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('report every case marked test.fails as unexpectedly passing when the page records no error', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'failed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'failed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the block held no dash before Enter, the typed case inconclusive without a retry once its dash never reached the page', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {missing: 'dash'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} Error: no beforeinput '-' reached the page in 9 reads after the dash's tap with 0.25s pauses between them, and the block still read ' ' with no event since the tap, ${INPUT_SENT}. The driver ended on a driver fault in "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting". ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the dash Gboard committed before Enter is the full-width one, naming its code points', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {crash: 'on the last commit', fullWidthDash: true},
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} Error: no beforeinput '-' reached the page in 9 reads after the dash's tap with 0.25s pauses between them, and the page logged beforeinput '－', code points U+FF0D, ${INPUT_SENT}. The driver ended on a driver fault in "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting". ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the page records the removeChild error before Enter', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {crash: 'before the last commit'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting": Error: word 1 did not reach the case's mechanism: the page recorded errors at the letters, which is not the case's trigger: ["${REMOVE_CHILD}"], and the page recorded errors: ["${REMOVE_CHILD}"], "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": Error: word 1 did not reach the case's mechanism: the page recorded errors at the letters, which is not the case's trigger: ["${REMOVE_CHILD}"], and the page recorded errors: ["${REMOVE_CHILD}"]. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the page also records an error other than removeChild', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {
            crash: 'on the last commit',
            error: 'TypeError: unrelated page failure',
          },
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting": Error: no error but the case's crash ${CRASH} was expected, and the page recorded errors: ['TypeError: unrelated page failure'], "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": Error: no error but the case's crash ${CRASH} was expected, and the page recorded errors: ['TypeError: unrelated page failure']. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the Behavior raised delete.text but the editor never performed it', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {missing: 'dispatch'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: the editor performed no delete.text over '- ' after the commit's tap, ${INPUT_SENT}. In "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: the editor performed no delete.text over '- ' after the commit's tap, ${INPUT_SENT}. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the page records the removeChild error on Enter but the raised delete.text was never performed', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {crash: 'on the last commit', missing: 'dispatch'},
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting": Error: word 1 did not reach the case's mechanism: the editor performed no delete.text over '- ' after the commit's tap, and the page recorded errors: ["${REMOVE_CHILD}"], "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": Error: word 1 did not reach the case's mechanism: the editor performed no delete.text over '- ' after the commit's tap, and the page recorded errors: ["${REMOVE_CHILD}"]. These tests are marked \`test.fails\`, which counts any error as the expected failure, so they say nothing about the editor.`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when delete.text was performed but Enter split the block without an error', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {missing: 'deletion'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: the block read '- \\n' after the commit, not '', ${INPUT_SENT}. In "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: the block read '- \\n' after the commit, not '', ${INPUT_SENT}. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the page records the removeChild error on Enter and delete.text reaches the page only after it', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {crash: 'on the last commit', deletionAfterError: true},
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting": Error: word 1 did not reach the case's mechanism: the editor performed no delete.text over '- ' after the commit's tap, and the page recorded errors: ["${REMOVE_CHILD}"], "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": Error: word 1 did not reach the case's mechanism: the editor performed no delete.text over '- ' after the commit's tap, and the page recorded errors: ["${REMOVE_CHILD}"]. These tests are marked \`test.fails\`, which counts any error as the expected failure, so they say nothing about the editor.`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
})

describe('the en.enter tests', () => {
  test('pass every case on the page in jsdom, on the desktop input path, where the Behavior deletes the dash on Enter', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: ['scripts/fixtures/suites/page-in-jsdom.ts'],
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail every case on the page in jsdom, on the desktop input path, once the page registers no Behavior', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: ['scripts/fixtures/suites/page-in-jsdom.ts'],
        provide: {jsdomPageWithoutBehavior: true},
      }),
    ).toEqual({
      file: 'failed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'failed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'failed',
        },
      ],
    })
  }, 30_000)
  test('pass every case marked test.fails when the page records the removeChild error on Enter', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {crash: 'on the last commit'}},
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('report every case marked test.fails as unexpectedly passing when the page records no error', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'failed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'failed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the block held no dash before Enter, the typed case inconclusive without a retry once its dash never reached the page', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {missing: 'dash'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} Error: no beforeinput '-' reached the page in 9 reads after the dash's tap with 0.25s pauses between them, and the block still read ' ' with no event since the tap, ${INPUT_SENT}. The driver ended on a driver fault in "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting". ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the page records the removeChild error before Enter', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {crash: 'before the last commit'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting": Error: word 1 did not reach the case's mechanism: the page recorded errors at the letters, which is not the case's trigger: ["${REMOVE_CHILD}"], and the page recorded errors: ["${REMOVE_CHILD}"], "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": Error: word 1 did not reach the case's mechanism: the page recorded errors at the letters, which is not the case's trigger: ["${REMOVE_CHILD}"], and the page recorded errors: ["${REMOVE_CHILD}"]. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the page also records an error other than removeChild', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {
            crash: 'on the last commit',
            error: 'TypeError: unrelated page failure',
          },
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting": Error: no error but the case's crash ${CRASH} was expected, and the page recorded errors: ['TypeError: unrelated page failure'], "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": Error: no error but the case's crash ${CRASH} was expected, and the page recorded errors: ['TypeError: unrelated page failure']. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('pass every case marked test.fails when the page records the removeChild error on Enter and the tap back to the letters then hangs, with a clean retry available', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/short-recovery.ts',
          ...CRASH_SETUP,
        ],
        provide: {crashPage: {crash: 'on the last commit', hungTapBack: true}},
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 60_000)
  test('fail the file of every case marked test.fails when the page records an error other than removeChild on Enter and the tap back to the letters then hangs', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/short-recovery.ts',
          ...CRASH_SETUP,
        ],
        provide: {
          crashPage: {
            error: 'TypeError: unrelated page failure',
            hungTapBack: true,
          },
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting": Error: no error but the case's crash ${CRASH} was expected, and the page recorded errors: ['TypeError: unrelated page failure'], "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": Error: no error but the case's crash ${CRASH} was expected, and the page recorded errors: ['TypeError: unrelated page failure']. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 60_000)
  test('pass every case marked test.fails when the page records the removeChild error on Enter and the screenshot after it then hangs until the attempt deadline, with a clean retry available', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/short-attempt.ts',
          ...CRASH_SETUP,
        ],
        provide: {
          crashPage: {crash: 'on the last commit', hungScreenshot: true},
        },
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 60_000)
  test('fail the file of every case marked test.fails when the page records the removeChild error on an Enter whose tap was rejected, only after the read once the tap failed, with a clean retry available', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {crash: 'on the last commit', rejectedEnter: true},
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} TapNotInjectedError: tap at 994,2196 was not injected, ${INPUT_SENT}. In "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} TapNotInjectedError: tap at 994,2196 was not injected, ${INPUT_SENT}. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 60_000)
  test('fail the file of every case marked test.fails when the screenshot after Enter and the read after the attempt deadline both hang, with a clean retry available', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/short-attempt.ts',
          ...CRASH_SETUP,
        ],
        provide: {
          crashPage: {
            crash: 'on the last commit',
            hungScreenshot: true,
            hungRead: true,
          },
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} DeadlineError: attempt en-pressing-enter-after-with-a-behavior-that-deletes-the-text-instead-of-splitting timed out after 1s, and the page could not be read after it: DeadlineError: reading the page after the fault timed out after 1s. In "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} DeadlineError: attempt en-typing-on-gboard-and-pressing-enter-with-a-behavior-that-deletes-the-text-instead-of-splitting timed out after 1s, and the page could not be read after it: DeadlineError: reading the page after the fault timed out after 1s. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 60_000)
  test('fail the file of every case marked test.fails when the Behavior raised delete.text but the editor never performed it', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {missing: 'dispatch'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: the editor performed no delete.text over '- ' after the commit's tap, ${INPUT_SENT}. In "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: the editor performed no delete.text over '- ' after the commit's tap, ${INPUT_SENT}. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the page records the removeChild error on Enter but the raised delete.text was never performed', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {crash: 'on the last commit', missing: 'dispatch'},
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting": Error: word 1 did not reach the case's mechanism: the editor performed no delete.text over '- ' after the commit's tap, and the page recorded errors: ["${REMOVE_CHILD}"], "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": Error: word 1 did not reach the case's mechanism: the editor performed no delete.text over '- ' after the commit's tap, and the page recorded errors: ["${REMOVE_CHILD}"]. These tests are marked \`test.fails\`, which counts any error as the expected failure, so they say nothing about the editor.`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when delete.text was performed but Enter split the block without an error', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {missing: 'deletion'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: the block read '- \\n' after the commit, not '', ${INPUT_SENT}. In "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: the block read '- \\n' after the commit, not '', ${INPUT_SENT}. ${TEST_FAILS}`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('fail the file of every case marked test.fails when the page records the removeChild error on Enter and delete.text reaches the page only after it', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {
          crashPage: {crash: 'on the last commit', deletionAfterError: true},
        },
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `The driver ended on a driver fault after the page recorded errors, or on errors other than the case's crash, in "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting": Error: word 1 did not reach the case's mechanism: the editor performed no delete.text over '- ' after the commit's tap, and the page recorded errors: ["${REMOVE_CHILD}"], "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": Error: word 1 did not reach the case's mechanism: the editor performed no delete.text over '- ' after the commit's tap, and the page recorded errors: ["${REMOVE_CHILD}"]. These tests are marked \`test.fails\`, which counts any error as the expected failure, so they say nothing about the editor.`,
      ],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
})

describe('the page in jsdom', () => {
  test('leaves `__state` as it found it after each case, set or absent before it', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/page-in-jsdom.ts',
          'scripts/fixtures/suites/jsdom-restores-state.ts',
        ],
      }),
    ).toEqual({
      file: 'passed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'passed',
        },
      ],
    })
  }, 30_000)
  test('leaves `__state` as it found it after each case that fails, set or absent before it', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/page-in-jsdom.ts',
          'scripts/fixtures/suites/jsdom-restores-state.ts',
        ],
        provide: {jsdomPageWithoutBehavior: true},
      }),
    ).toEqual({
      file: 'failed',
      errors: [],
      tests: [
        {
          name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          state: 'failed',
        },
        {
          name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          state: 'failed',
        },
      ],
    })
  }, 30_000)
})

describe('the job summary line', () => {
  test('counts an expected crash reproduced and an inconclusive call apart from passed and failed tests', async () => {
    const summaryFile = join(
      mkdtempSync(join(tmpdir(), 'android-ime-')),
      'summary.md',
    )
    vi.stubEnv('IME_SUMMARY_FILE', summaryFile)
    try {
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {crash: 'on the last commit'}},
      })
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {missing: 'dispatch'}},
      })
    } finally {
      vi.unstubAllEnvs()
    }

    expect(readFileSync(summaryFile, 'utf8')).toEqual(
      '`tests/en.enter.test.ts`: 0 passed, 0 failed, 2 expected crash reproduced ("Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting", "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting"), 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n' +
        '`tests/en.enter.test.ts`: 0 passed, 0 failed, 0 expected crash reproduced, 0 expected failure, 2 inconclusive ("Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting", "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting"), 0 device offline, 0 driver fault\n',
    )
  }, 60_000)

  test('counts a test whose device went offline in the restart before its retry as device offline, apart from ones that ended inconclusive otherwise, and notes a timeout after which adb still answered', async () => {
    const summaryFile = join(
      mkdtempSync(join(tmpdir(), 'android-ime-')),
      'summary.md',
    )
    vi.stubEnv('IME_SUMMARY_FILE', summaryFile)
    let result: Awaited<ReturnType<typeof runSuite>>
    try {
      result = await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: [
          ...CRASH_SETUP.slice(0, -1),
          'scripts/fixtures/suites/device-goes-offline.ts',
          'tests/setup.ts',
        ],
        provide: {crashPage: {hungFirstDump: true}},
      })
    } finally {
      vi.unstubAllEnvs()
    }

    expect({result, summary: readFileSync(summaryFile, 'utf8')}).toEqual({
      result: {
        file: 'failed',
        errors: [
          `In "Scenario: Pressing Enter after \"- \" with a Behavior that deletes the text instead of splitting": ${NO_FRESH_CHROME} adb timed out during the Chrome restart: adb shell pidof com.android.chrome ran past 5s after the force-stop, old pid 4100, new pid unread. In "Scenario: Typing \"- \" on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": ${DEVICE_OFFLINE} adb shell pidof com.android.chrome failed before the restart: CommandError: adb shell pidof com.android.chrome; echo pidof exit $? exited with 1: adb: device offline, old pid unread, new pid unread. ${TEST_FAILS}`,
        ],
        tests: [
          {
            name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
            state: 'passed',
          },
          {
            name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
            state: 'passed',
          },
        ],
      },
      summary:
        '`tests/en.enter.test.ts`: 0 passed, 0 failed, 0 expected crash reproduced, 0 expected failure, 1 inconclusive ("Scenario: Pressing Enter after \"- \" with a Behavior that deletes the text instead of splitting"), 1 device offline ("Scenario: Typing \"- \" on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting"), 0 driver fault\n' +
        '\n' +
        'Not counted as device offline: adb could still reach the device right after the failure. A device that dropped off and came back before that check is missed, so the device offline count can be too low.\n',
    })
  }, 60_000)

  test("ends each test inconclusive, with no typing in the retry and no driver fault, and notes that the device's reachability went unchecked, when the retry's pid read times out just before the attempt deadline and the `adb get-state` after it is stopped", async () => {
    const directory = mkdtempSync(join(tmpdir(), 'android-ime-'))
    const summaryFile = join(directory, 'summary.md')
    const callsFile = join(directory, 'calls.jsonl')
    vi.stubEnv('IME_SUMMARY_FILE', summaryFile)
    vi.stubEnv('IME_CALLS_FILE', callsFile)
    let result: Awaited<ReturnType<typeof runSuite>>
    try {
      result = await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: [
          ...CRASH_SETUP.slice(0, -1),
          'scripts/fixtures/suites/pid-read-at-attempt-deadline.ts',
          'tests/setup.ts',
        ],
        testTimeout: 30_000,
        provide: {crashPage: {hungFirstDump: true}},
      })
    } finally {
      vi.unstubAllEnvs()
    }

    const calls = {
      taps: [[]],
      chrome: [
        'pidof 4100',
        'force-stop',
        'pidof 4101',
        'pidof 4101',
        'get-state',
        'force-stop',
      ],
    }
    const noFreshChrome = `${NO_FRESH_CHROME} adb timed out during the Chrome restart: adb shell pidof com.android.chrome ran past 5s after the relaunch, old pid 4100, new pid unread`
    expect({
      result,
      summary: readFileSync(summaryFile, 'utf8'),
      calls: readFileSync(callsFile, 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line)),
    }).toEqual({
      result: {
        file: 'failed',
        errors: [
          `In "Scenario: Pressing Enter after \"- \" with a Behavior that deletes the text instead of splitting": ${noFreshChrome}. In "Scenario: Typing \"- \" on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": ${noFreshChrome}. ${TEST_FAILS}`,
        ],
        tests: [
          {
            name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
            state: 'passed',
          },
          {
            name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
            state: 'passed',
          },
        ],
      },
      summary:
        '`tests/en.enter.test.ts`: 0 passed, 0 failed, 0 expected crash reproduced, 0 expected failure, 2 inconclusive ("Scenario: Pressing Enter after \"- \" with a Behavior that deletes the text instead of splitting", "Scenario: Typing \"- \" on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting"), 0 device offline, 0 driver fault\n' +
        '\n' +
        'Could not check whether the device was reachable, so the device offline count can be too low.\n',
      calls: [
        {
          test: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
          ...calls,
        },
        {
          test: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
          ...calls,
        },
      ],
    })
  }, 60_000)

  test("counts a test whose `adb get-state` after a pid read that timed out outlives SIGKILL as a driver fault, and notes that the device's reachability went unchecked", async () => {
    const summaryFile = join(
      mkdtempSync(join(tmpdir(), 'android-ime-')),
      'summary.md',
    )
    vi.stubEnv('IME_SUMMARY_FILE', summaryFile)
    let result: Awaited<ReturnType<typeof runSuite>>
    try {
      result = await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: [
          ...CRASH_SETUP.slice(0, -1),
          'scripts/fixtures/suites/device-state-outlives-sigkill.ts',
          'tests/setup.ts',
        ],
        provide: {crashPage: {hungFirstDump: true}},
      })
    } finally {
      vi.unstubAllEnvs()
    }

    expect({result, summary: readFileSync(summaryFile, 'utf8')}).toEqual({
      result: {
        file: 'failed',
        errors: [
          'adb get-state (pid 4343) outlived SIGKILL and may still have touched the device during later tests, so no result in this file can be trusted.',
        ],
        tests: [
          {
            name: 'Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting',
            state: 'passed',
          },
          {
            name: 'Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting',
            state: 'passed',
          },
        ],
      },
      summary:
        '`tests/en.enter.test.ts`: 0 passed, 0 failed, 0 expected crash reproduced, 0 expected failure, 0 inconclusive, 0 device offline, 2 driver fault ("Scenario: Pressing Enter after \"- \" with a Behavior that deletes the text instead of splitting", "Scenario: Typing \"- \" on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting")\n' +
        '\n' +
        'Could not check whether the device was reachable, so the device offline count can be too low.\n',
    })
  }, 60_000)

  test('counts the きょう case, marked test.fails, as an expected crash reproduced when only it records the removeChild error, next to the 今日 case passing', async () => {
    const summaryFile = join(
      mkdtempSync(join(tmpdir(), 'android-ime-')),
      'summary.md',
    )
    vi.stubEnv('IME_SUMMARY_FILE', summaryFile)
    let result: Awaited<ReturnType<typeof runSuite>>
    try {
      result = await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/gboard-with-layouts.ts',
          'scripts/fixtures/suites/crash-page.ts',
          'tests/setup.ts',
        ],
        provide: {
          crashPage: {crash: 'on the last commit', crashOnlyIn: 'きょう'},
        },
      })
    } finally {
      vi.unstubAllEnvs()
    }

    expect({result, summary: readFileSync(summaryFile, 'utf8')}).toEqual({
      result: {
        file: 'passed',
        errors: [],
        tests: [
          {
            name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
            state: 'passed',
          },
          {
            name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
            state: 'passed',
          },
        ],
      },
      summary:
        '`tests/ja.crashes.test.ts`: 1 passed ("Scenario: Typing kyou twice while each 今日 is decorated as it is committed"), 0 failed, 1 expected crash reproduced ("Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it"), 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n',
    })
  }, 60_000)

  test('reports the きょう case, marked test.fails, as failed when it records no error', async () => {
    const summaryFile = join(
      mkdtempSync(join(tmpdir(), 'android-ime-')),
      'summary.md',
    )
    vi.stubEnv('IME_SUMMARY_FILE', summaryFile)
    let result: Awaited<ReturnType<typeof runSuite>>
    try {
      result = await runSuite({
        file: 'tests/ja.crashes.test.ts',
        setupFiles: [
          'scripts/fixtures/suites/gboard-with-layouts.ts',
          'scripts/fixtures/suites/crash-page.ts',
          'tests/setup.ts',
        ],
        provide: {crashPage: {}},
      })
    } finally {
      vi.unstubAllEnvs()
    }

    expect({result, summary: readFileSync(summaryFile, 'utf8')}).toEqual({
      result: {
        file: 'failed',
        errors: [],
        tests: [
          {
            name: 'Scenario: Typing kyou twice while each 今日 is decorated as it is committed',
            state: 'passed',
          },
          {
            name: 'Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it',
            state: 'failed',
          },
        ],
      },
      summary:
        '`tests/ja.crashes.test.ts`: 1 passed ("Scenario: Typing kyou twice while each 今日 is decorated as it is committed"), 1 failed ("Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it"), 0 expected crash reproduced, 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n',
    })
  }, 60_000)

  test('counts a timed-out call as a driver fault, with or without test.fails, and a completed test.fails call without a crash as an expected failure', async () => {
    const summaryFile = join(
      mkdtempSync(join(tmpdir(), 'android-ime-')),
      'summary.md',
    )
    vi.stubEnv('IME_SUMMARY_FILE', summaryFile)
    try {
      await runSuite({
        file: 'scripts/fixtures/suites/empty-block-and-existing-text.ts',
        setupFiles: [
          'scripts/fixtures/suites/typing-hangs.ts',
          'tests/setup.ts',
        ],
        testTimeout: 1_000,
      })
      await runSuite({
        file: 'scripts/fixtures/suites/failing-empty-block.ts',
        setupFiles: [
          'scripts/fixtures/suites/typing-loses-first-character.ts',
          'tests/setup.ts',
        ],
      })
    } finally {
      vi.unstubAllEnvs()
    }

    expect(readFileSync(summaryFile, 'utf8')).toEqual(
      '`scripts/fixtures/suites/empty-block-and-existing-text.ts`: 0 passed, 0 failed, 0 expected crash reproduced, 0 expected failure, 0 inconclusive, 0 device offline, 2 driver fault ("Scenario: Typing kyou into an empty block", "Scenario: Typing kyou after existing text")\n' +
        '`scripts/fixtures/suites/failing-empty-block.ts`: 0 passed, 0 failed, 0 expected crash reproduced, 1 expected failure ("Scenario: Typing kyou into an empty block"), 0 inconclusive, 0 device offline, 0 driver fault\n',
    )
  }, 60_000)
})
