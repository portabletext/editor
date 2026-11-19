import {expect, test, vi} from 'vitest'
import {driverRuns, runOnDevice} from '../../driver.ts'

test('Scenario: A call with its options first throws before the device', async () => {
  const options = {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
  }
  const call = runOnDevice as unknown as (
    options: unknown,
  ) => ReturnType<typeof runOnDevice>

  await expect(call(options)).rejects.toThrow(
    '`runOnDevice` takes the context Vitest passes to the test first: `runOnDevice(context, options)`',
  )
  expect({runs: driverRuns, calls: globalThis.deviceCalls}).toEqual({
    runs: [],
    calls: [],
  })
})

test('Scenario: Typing kyou after a driver fault', async (context) => {
  vi.useFakeTimers()
  const typing = runOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
  })
  await vi.runAllTimersAsync()
  const typed = await typing

  expect({text: typed.text, calls: globalThis.deviceCalls}).toEqual({
    text: '今日',
    calls: [
      'attempt 1',
      'dump start',
      'dump stopped',
      'close chrome',
      'attempt 2',
      'close chrome',
    ],
  })
})
