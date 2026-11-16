import {describe, expect, test} from 'vitest'
import {summaryLines, tapsBlock} from './summary.ts'

const taps = [
  {
    keys: ['k', 'y', 'o', 'u', 'Space'],
    events: [
      {type: 'compositionstart'},
      {type: 'beforeinput', inputType: 'insertCompositionText', data: 'K'},
      {type: 'compositionend', data: 'Kyou'},
    ],
  },
  {
    keys: ['Enter'],
    events: [
      {type: 'beforeinput', inputType: 'insertLineBreak'},
      {type: 'input', inputType: 'insertLineBreak'},
    ],
  },
]

describe(tapsBlock.name, () => {
  test('prints the keys sent and the page events of each step', () => {
    expect(tapsBlock('Scenario: kyou', taps)).toEqual(
      [
        'Taps sent and page events for "Scenario: kyou":',
        '  step 1: sent k y o u Space',
        '          page compositionstart, beforeinput insertCompositionText "K", compositionend "Kyou"',
        '  step 2: sent Enter',
        '          page beforeinput insertLineBreak, input insertLineBreak',
      ].join('\n'),
    )
  })

  test('a step with no keys or no events says so', () => {
    expect(tapsBlock('t', [{keys: [], events: []}])).toEqual(
      [
        'Taps sent and page events for "t":',
        '  step 1: sent (none)',
        '          page (none)',
      ].join('\n'),
    )
  })
})

describe(summaryLines.name, () => {
  test('escapes a backslash before a pipe in table cells', () => {
    expect(
      summaryLines(
        'a.test.ts',
        [{name: 'foo\\|bar', outcome: 'failed', errorMessage: 'bad \\| value'}],
        [],
      ),
    ).toEqual(
      '`a.test.ts`: 0 passed, 1 failed, 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n\n| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n| 1 | foo\\\\\\|bar | failed |  | bad \\\\\\| value |\n\n',
    )
  })

  test('strips ANSI escape codes from a failure message', () => {
    expect(
      summaryLines(
        'a.test.ts',
        [
          {
            name: 'foo',
            outcome: 'failed',
            errorMessage: '\u001b[31massertion failed\u001b[39m\nstack detail',
          },
        ],
        [],
      ),
    ).toEqual(
      '`a.test.ts`: 0 passed, 1 failed, 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n\n| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n| 1 | foo | failed |  | assertion failed |\n\n',
    )
  })

  test('prints a page exception when a failed test has no error', () => {
    expect(
      summaryLines(
        'a.test.ts',
        [
          {
            name: 'foo',
            outcome: 'failed',
            pageException: 'page threw',
            reason: 'driver reason',
          },
        ],
        [],
      ),
    ).toEqual(
      '`a.test.ts`: 0 passed, 1 failed, 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n\n| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n| 1 | foo | failed |  | page threw |\n\n',
    )
  })

  test('carries the taps of a failed test only', () => {
    expect(
      summaryLines(
        'a.test.ts',
        [
          {name: 'passes', outcome: 'passed'},
          {name: 'fails', outcome: 'failed', taps},
        ],
        [],
      ),
    ).toEqual(
      [
        '`a.test.ts`: 1 passed, 1 failed, 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n',
        '| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n| 1 | passes | passed |  |  |\n| 2 | fails | failed |  |  |\n',
        `${tapsBlock('fails', taps)}\n`,
        '',
      ].join('\n'),
    )
  })

  test('prints every mistap retry and its test name under either driver', () => {
    expect(
      summaryLines(
        'a.test.ts',
        [],
        [
          {test: 'symbol', fails: false, state: 'complete', mistapRetries: 1},
          {
            test: 'digit',
            fails: false,
            state: 'inconclusive',
            mistapRetries: 1,
          },
          {test: 'symbol', fails: false, state: 'complete', mistapRetries: 1},
        ],
      ),
    ).toEqual(
      '`a.test.ts`: 0 passed, 0 failed, 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n\n| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n\n3 mistap retries ("symbol": 2, "digit": 1)\n\n',
    )
  })

  test('prints the duration of a passed test in seconds', () => {
    expect(
      summaryLines(
        'a.test.ts',
        [{name: 'foo', outcome: 'passed', duration: 23400}],
        [],
      ),
    ).toEqual(
      '`a.test.ts`: 1 passed, 0 failed, 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n\n| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n| 1 | foo | passed | 23.4 s |  |\n\n',
    )
  })

  test('prints the first line of a failure message', () => {
    expect(
      summaryLines(
        'a.test.ts',
        [
          {
            name: 'foo',
            outcome: 'failed',
            errorMessage: 'assertion failed\nstack detail',
          },
        ],
        [],
      ),
    ).toEqual(
      '`a.test.ts`: 0 passed, 1 failed, 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n\n| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n| 1 | foo | failed |  | assertion failed |\n\n',
    )
  })

  test('leaves the Failure column empty for an expected failure', () => {
    expect(
      summaryLines(
        'a.test.ts',
        [
          {
            name: 'foo',
            outcome: 'expected failure',
            errorMessage: 'expected error',
          },
        ],
        [],
      ),
    ).toEqual(
      '`a.test.ts`: 0 passed, 0 failed, 1 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n\n| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n| 1 | foo | expected failure |  |  |\n\n',
    )
  })

  test("prints the driver's reason for a device offline test without an error", () => {
    expect(
      summaryLines(
        'a.test.ts',
        [
          {
            name: 'foo',
            outcome: 'device offline',
            reason: 'adb lost the device',
          },
        ],
        [],
      ),
    ).toEqual(
      '`a.test.ts`: 0 passed, 0 failed, 0 expected failure, 0 inconclusive, 1 device offline, 0 driver fault\n\n| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n| 1 | foo | device offline |  | adb lost the device |\n\n',
    )
  })

  test('prints a test that did not run as not run, without a duration', () => {
    expect(
      summaryLines(
        'a.test.ts',
        [{name: 'foo', outcome: undefined, duration: 123}],
        [],
      ),
    ).toEqual(
      '`a.test.ts`: 0 passed, 0 failed, 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n\n| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n| 1 | foo | not run |  |  |\n\n',
    )
  })

  test('numbers two tests with the same name apart', () => {
    expect(
      summaryLines(
        'a.test.ts',
        [
          {name: 'foo', outcome: 'passed'},
          {name: 'foo', outcome: 'passed'},
        ],
        [],
      ),
    ).toEqual(
      '`a.test.ts`: 2 passed, 0 failed, 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n\n| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n| 1 | foo | passed |  |  |\n| 2 | foo | passed |  |  |\n\n',
    )
  })

  test('escapes pipes and replaces newlines and backticks in table cells', () => {
    expect(
      summaryLines(
        'a.test.ts',
        [
          {
            name: 'foo|\n`bar`',
            outcome: 'failed',
            errorMessage: 'bad | `value`\nmore',
          },
        ],
        [],
      ),
    ).toEqual(
      "`a.test.ts`: 0 passed, 1 failed, 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n\n| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n| 1 | foo\\| 'bar' | failed |  | bad \\| 'value' |\n\n",
    )
  })

  test('cuts a failure message to 200 characters', () => {
    expect(
      summaryLines(
        'a.test.ts',
        [
          {
            name: 'foo',
            outcome: 'failed',
            errorMessage:
              'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          },
        ],
        [],
      ),
    ).toEqual(
      '`a.test.ts`: 0 passed, 1 failed, 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n\n| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n| 1 | foo | failed |  | aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa… |\n\n',
    )
  })

  test('prints a full test name with nested suites', () => {
    expect(
      summaryLines(
        'a.test.ts',
        [{name: 'foo > bar > baz', outcome: 'passed'}],
        [],
      ),
    ).toEqual(
      '`a.test.ts`: 1 passed, 0 failed, 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n\n| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n| 1 | foo > bar > baz | passed |  |  |\n\n',
    )
  })

  test("prints the test's error instead of the driver's reason", () => {
    expect(
      summaryLines(
        'a.test.ts',
        [
          {
            name: 'foo',
            outcome: 'inconclusive',
            errorMessage: 'first error',
            pageException: 'page threw',
            reason: 'driver reason',
          },
        ],
        [],
      ),
    ).toEqual(
      '`a.test.ts`: 0 passed, 0 failed, 0 expected failure, 1 inconclusive, 0 device offline, 0 driver fault\n\n| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n| 1 | foo | inconclusive |  | first error |\n\n',
    )
  })

  test('prints a driver fault reason', () => {
    expect(
      summaryLines(
        'a.test.ts',
        [{name: 'foo', outcome: 'driver fault', reason: 'driver stopped'}],
        [],
      ),
    ).toEqual(
      '`a.test.ts`: 0 passed, 0 failed, 0 expected failure, 0 inconclusive, 0 device offline, 1 driver fault\n\n| # | Test | Outcome | Duration | Failure |\n| --- | --- | --- | --- | --- |\n| 1 | foo | driver fault |  | driver stopped |\n\n',
    )
  })
})
