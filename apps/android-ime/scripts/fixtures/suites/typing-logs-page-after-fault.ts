import {expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'

const CRASH = /^NotFoundError: Failed to execute 'removeChild' on 'Node'/

const INCONCLUSIVE =
  'InconclusiveAttempt: Inconclusive: the driver faulted after typing started, so this run cannot tell whether the editor crashed. This is not a crash reproduction and not an editor failure. Rerun the job. The fault:'

test('Scenario: A crash case that faults after a letter logs the page it reads after the fault and ends inconclusive', async () => {
  vi.useFakeTimers()
  const log = vi.spyOn(console, 'log')
  losesFocusAfterK()
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?decorate=you',
    prefix: '',
    words: [{letters: 'kyou', expect: {trigger: 'letters'}}],
    crash: CRASH,
  }).catch((error: Error) => `${error.name}: ${error.message}`)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
    pageAfterFault: pageAfterFaultLines(log.mock.calls),
  }).toEqual({
    error: `${INCONCLUSIVE} Error: no Gboard node labelled 'y', labels: [], and input the attempt sent may still reach the page, so a read without errors after it is no result`,
    taps: [['K']],
    run: 'inconclusive',
    pageAfterFault: ["page after the fault: text 'K', dom '', focused False"],
  })
})

test('Scenario: Printing the page after the fault throws', async () => {
  vi.useFakeTimers()
  const log = vi
    .spyOn(console, 'log')
    .mockImplementation((...args: unknown[]) => {
      if (
        typeof args[0] === 'string' &&
        /page (after the fault|log after the fault failed)/.test(args[0])
      )
        throw new Error('stdout closed')
    })
  losesFocusAfterK()
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html?decorate=you',
    prefix: '',
    words: [{letters: 'kyou', expect: {trigger: 'letters'}}],
    crash: CRASH,
  }).catch((error: Error) => `${error.name}: ${error.message}`)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
    pageAfterFault: pageAfterFaultLines(log.mock.calls),
  }).toEqual({
    error: `${INCONCLUSIVE} Error: no Gboard node labelled 'y', labels: [], and input the attempt sent may still reach the page, so a read without errors after it is no result`,
    taps: [['K']],
    run: 'inconclusive',
    pageAfterFault: ["page after the fault: text 'K', dom '', focused False"],
  })
})

test('Scenario: A call without a crash reads no page after the fault and is retried', async () => {
  vi.useFakeTimers()
  const log = vi.spyOn(console, 'log')
  losesFocusAfterK()
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'kyou '}],
  })
  await vi.runAllTimersAsync()

  expect({
    text: (await typing).text,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
    pageAfterFault: pageAfterFaultLines(log.mock.calls),
  }).toEqual({
    text: 'Kyou ',
    taps: [['K'], ['K', 'Y', 'O', 'U', 'Space']],
    run: 'complete',
    pageAfterFault: [],
  })
})

function pageAfterFaultLines(calls: unknown[][]): unknown[] {
  return calls
    .map(([line]) => line)
    .filter(
      (line): line is string =>
        typeof line === 'string' && line.includes('page after the fault'),
    )
    .map((line) => line.replace(/^PHASE \+\s*[\d.]+s /, ''))
}

function losesFocusAfterK(): void {
  globalThis.fakeGboard({
    lang: 'en',
    loseKeyboardAfter: 'K',
    page: (taps) => {
      const letters = taps.filter((tap) => /^[A-Z]$/.test(tap))
      const text =
        letters
          .map((letter, index) => (index === 0 ? letter : letter.toLowerCase()))
          .join('') + (taps.includes('Space') ? ' ' : '')
      return {text, dom: text.slice(0, -1), focused: taps.length > 1}
    },
  })
}
