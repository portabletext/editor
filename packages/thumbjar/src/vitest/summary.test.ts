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
        '`a.test.ts`: 1 passed ("passes"), 1 failed ("fails"), 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n',
        `${tapsBlock('fails', taps)}\n`,
      ].join('\n'),
    )
  })
})

test('prints every mistap retry and its test name under either driver', () => {
  expect(
    summaryLines(
      'a.test.ts',
      [],
      [
        {test: 'symbol', fails: false, state: 'complete', mistapRetries: 1},
        {test: 'digit', fails: false, state: 'inconclusive', mistapRetries: 1},
        {test: 'symbol', fails: false, state: 'complete', mistapRetries: 1},
      ],
    ),
  ).toEqual(
    '`a.test.ts`: 0 passed, 0 failed, 0 expected failure, 0 inconclusive, 0 device offline, 0 driver fault\n\n3 mistap retries ("symbol": 2, "digit": 1)\n',
  )
})
