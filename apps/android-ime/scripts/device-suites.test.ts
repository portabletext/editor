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
  test('fail the file of every case marked test.fails when the block held no dash before Enter', async () => {
    expect(
      await runSuite({
        file: 'tests/ja.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {missing: 'dash'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: the block read ' ', not '- ', ${INPUT_SENT}. The driver ended on a driver fault in "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting". ${TEST_FAILS}`,
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
        `In "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: the block read '－ ', not '- ', code points U+FF0D U+0020 for U+002D U+0020, ${INPUT_SENT}. The driver ended on a driver fault in "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting". ${TEST_FAILS}`,
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
  test('fail the file of every case marked test.fails when the block held no dash before Enter', async () => {
    expect(
      await runSuite({
        file: 'tests/en.enter.test.ts',
        setupFiles: CRASH_SETUP,
        provide: {crashPage: {missing: 'dash'}},
      }),
    ).toEqual({
      file: 'failed',
      errors: [
        `In "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting": ${INCONCLUSIVE} Error: word 1 did not reach the case's mechanism: the block read ' ', not '- ', ${INPUT_SENT}. The driver ended on a driver fault in "Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting". ${TEST_FAILS}`,
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
      '`tests/en.enter.test.ts`: 0 passed, 0 failed, 2 expected crash reproduced ("Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting", "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting"), 0 expected failure, 0 inconclusive, 0 driver fault\n' +
        '`tests/en.enter.test.ts`: 0 passed, 0 failed, 0 expected crash reproduced, 0 expected failure, 2 inconclusive ("Scenario: Pressing Enter after "- " with a Behavior that deletes the text instead of splitting", "Scenario: Typing "- " on Gboard and pressing Enter with a Behavior that deletes the text instead of splitting"), 0 driver fault\n',
    )
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
        '`tests/ja.crashes.test.ts`: 1 passed ("Scenario: Typing kyou twice while each 今日 is decorated as it is committed"), 0 failed, 1 expected crash reproduced ("Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it"), 0 expected failure, 0 inconclusive, 0 driver fault\n',
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
        '`tests/ja.crashes.test.ts`: 1 passed ("Scenario: Typing kyou twice while each 今日 is decorated as it is committed"), 1 failed ("Scenario: Typing kyou twice while the composing きょう is decorated until 今日 replaces it"), 0 expected crash reproduced, 0 expected failure, 0 inconclusive, 0 driver fault\n',
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
      '`scripts/fixtures/suites/empty-block-and-existing-text.ts`: 0 passed, 0 failed, 0 expected crash reproduced, 0 expected failure, 0 inconclusive, 2 driver fault ("Scenario: Typing kyou into an empty block", "Scenario: Typing kyou after existing text")\n' +
        '`scripts/fixtures/suites/failing-empty-block.ts`: 0 passed, 0 failed, 0 expected crash reproduced, 1 expected failure ("Scenario: Typing kyou into an empty block"), 0 inconclusive, 0 driver fault\n',
    )
  }, 60_000)
})
