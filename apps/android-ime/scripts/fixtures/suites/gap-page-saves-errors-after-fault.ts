import {readFileSync} from 'node:fs'
import {expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'
import {OUT} from '../../lib/typing.ts'

const ERROR =
  "NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."

test('Scenario: A gap page whose keyboard is gone after word 1 saves the error its page and console hold and is retried', async () => {
  vi.useFakeTimers()
  const log = vi.spyOn(console, 'log')
  globalThis.fakeGboard({
    lang: 'ja',
    texts: ['bar\n今日', 'bar\n今日今日'],
    candidate: '今日',
    loseKeyboardAfter: '今日',
    errorsFrom: 1,
    console: [
      {
        source: 'exception',
        text: `Uncaught ${ERROR}\n    at removeChild (editor.js:1:1)`,
      },
    ],
  })
  const typing = typeOnDevice({
    lang: 'ja',
    page: 'editor.html?gap=bar&hold=1',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })
  await vi.runAllTimersAsync()
  const attempt = JSON.parse(
    readFileSync(
      `${OUT}/ja-a-gap-page-whose-keyboard-is-gone-after-word-1-saves-the-error-its-page-and-console-hold-and-is-retried.json`,
      'utf8',
    ),
  )

  expect({
    text: (await typing).text,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
    fault: attempt.fault,
    faultErrors: attempt.faultState?.errors,
    faultConsole: attempt.faultConsole,
    firstErrorLines: log.mock.calls
      .map(([line]) => line)
      .filter(
        (line): line is string =>
          typeof line === 'string' &&
          line.includes('first error after the fault'),
      )
      .map((line) => line.replace(/^PHASE \+\s*[\d.]+s /, '')),
  }).toEqual({
    text: 'bar\n今日今日',
    taps: [
      ['k', 'y', 'o', 'u', '今日'],
      ['k', 'y', 'o', 'u', '今日', 'k', 'y', 'o', 'u', '今日'],
    ],
    run: 'complete',
    fault: "Error: no Gboard node labelled 'k', labels: []",
    faultErrors: [ERROR],
    faultConsole: [
      {
        source: 'exception',
        text: `Uncaught ${ERROR}\n    at removeChild (editor.js:1:1)`,
      },
    ],
    firstErrorLines: [`first error after the fault: ${ERROR}`],
  })
})
