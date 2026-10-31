import {expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'

test('Scenario: Stopping Chrome for the retry leaves an adb process that outlives SIGKILL', async () => {
  globalThis.firstAttemptFaults = true
  vi.useFakeTimers()
  const typing = typeOnDevice({
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    words: [{letters: 'kyou', candidate: '今日'}],
  }).catch((error: Error) => error.name)
  await vi.runAllTimersAsync()

  expect({
    error: await typing,
    attempts: globalThis.typingAttempts(),
    runs: driverRuns.map((run) => run.state),
  }).toEqual({
    error: 'ProcessNotStoppedError',
    attempts: 1,
    runs: ['faulted'],
  })
})
