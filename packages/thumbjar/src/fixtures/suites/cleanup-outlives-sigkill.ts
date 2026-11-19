import {expect, test, vi} from 'vitest'
import {driverRuns, runOnDevice} from '../../driver.ts'

test.fails('Scenario: Stopping Chrome after typing leaves an adb process that outlives SIGKILL', async (context) => {
  globalThis.firstAttemptFaults = false
  vi.useFakeTimers()
  const typing = runOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
  })
  await Promise.allSettled([typing, vi.runAllTimersAsync()])
  const typed = await typing

  expect(typed.text).toEqual('今日')
})

test('Scenario: The next test types nothing', async (context) => {
  await expect(
    runOnDevice(context, {
      keyboard: 'ja',
      url: 'http://localhost:8765/editor.html',
      prefix: 'x',
      steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
    }),
  ).rejects.toThrow(
    'not starting device work while adb shell am force-stop com.android.chrome (pid 4242) may still run',
  )

  expect({
    attempts: globalThis.typingAttempts(),
    runs: driverRuns.map((run) => run.state),
  }).toEqual({
    attempts: 1,
    runs: ['faulted', 'faulted'],
  })
})
