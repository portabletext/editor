import {expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'
import {DASH_READS} from '../../lib/typing.ts'

const CRASH = /^NotFoundError: Failed to execute 'removeChild' on 'Node'/

const DASH_SPACE = {
  at: {
    anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
    focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 2},
  },
}

const INCONCLUSIVE =
  "InconclusiveAttempt: Inconclusive: the driver faulted after typing started, so this run cannot tell whether the editor crashed. This is not a crash reproduction and not an editor failure. Rerun the job. The fault: Error: no beforeinput '-' reached the page in 9 reads after the dash's tap with 0.25s pauses between them, and the block still read '' with no event since the tap, and input the attempt sent may still reach the page, so a read without errors after it is no result"

function typeDashSpaceEnter() {
  return typeOnDevice({
    lang: 'en',
    page: 'editor.html?behavior=dissolve-on-break',
    prefix: '',
    words: [
      {
        letters: '- ',
        enter: true,
        expect: {
          trigger: 'commit',
          text: '- ',
          deletedOnCommit: '- ',
          textOnCommit: '',
          blocksOnCommit: 1,
        },
      },
    ],
    crash: CRASH,
  })
}

/** The page once the dash and Space reached it, and after Enter, where the Behavior deletes them. */
function dashPage(taps: string[]) {
  return taps.includes('Enter')
    ? {text: '', deletions: [DASH_SPACE]}
    : {text: taps.includes('Space') ? '- ' : taps.includes('Dash') ? '-' : ''}
}

test('Scenario: A dash that reaches the page on the last read after its tap is typed on, and the call completes', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'en',
    page: dashPage,
    dashArrives: {afterReads: DASH_READS - 1},
  })
  const typing = typeDashSpaceEnter()
  await vi.runAllTimersAsync()

  expect({
    text: (await typing).text,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
  }).toEqual({
    text: '',
    taps: [['Symbol keyboard', 'Dash', 'Space', 'Enter', 'Letter keyboard']],
    run: 'complete',
  })
})

test('Scenario: A dash tap that never reaches the page ends the call inconclusive, with no retry', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({lang: 'en', page: dashPage, dashArrives: 'never'})
  const typing = typeDashSpaceEnter().catch(
    (error: Error) => `${error.name}: ${error.message}`,
  )
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
    chrome: globalThis.chromeCalls(),
  }).toEqual({
    error: INCONCLUSIVE,
    taps: [['Symbol keyboard', 'Dash', 'Letter keyboard']],
    run: 'inconclusive',
    chrome: ['force-stop'],
  })
})

test('Scenario: A dash that reaches the page only on the read after the fault ends the call inconclusive, with no retry', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'en',
    page: dashPage,
    dashArrives: {afterReads: DASH_READS},
  })
  const typing = typeDashSpaceEnter().catch(
    (error: Error) => `${error.name}: ${error.message}`,
  )
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
    chrome: globalThis.chromeCalls(),
  }).toEqual({
    error: INCONCLUSIVE,
    taps: [['Symbol keyboard', 'Dash', 'Letter keyboard']],
    run: 'inconclusive',
    chrome: ['force-stop'],
  })
})

test('Scenario: A dash that lands with the error only on the tap back to the letters, Chrome still running, ends the call inconclusive, with no retry', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'en',
    page: dashPage,
    dashArrives: {onFirstDump: {chromeExits: false}},
  })
  const typing = typeDashSpaceEnter().catch(
    (error: Error) => `${error.name}: ${error.message}`,
  )
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    landed: globalThis.lateDashLanded(),
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
    chrome: globalThis.chromeCalls(),
  }).toEqual({
    error: INCONCLUSIVE,
    landed: true,
    taps: [['Symbol keyboard', 'Dash', 'Letter keyboard']],
    run: 'inconclusive',
    chrome: ['force-stop'],
  })
})

test('Scenario: A dash that lands with the error only on the tap back to the letters, Chrome then exiting, ends the call inconclusive, with no retry', async () => {
  vi.useFakeTimers()
  globalThis.fakeGboard({
    lang: 'en',
    page: dashPage,
    dashArrives: {onFirstDump: {chromeExits: true}},
  })
  const typing = typeDashSpaceEnter().catch(
    (error: Error) => `${error.name}: ${error.message}`,
  )
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    landed: globalThis.lateDashLanded(),
    taps: globalThis.gboardTaps(),
    run: driverRuns.at(-1)?.state,
    chrome: globalThis.chromeCalls(),
  }).toEqual({
    error: INCONCLUSIVE,
    landed: true,
    taps: [['Symbol keyboard', 'Dash', 'Letter keyboard']],
    run: 'inconclusive',
    chrome: ['force-stop'],
  })
})
