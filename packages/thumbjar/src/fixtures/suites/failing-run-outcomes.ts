import {beforeEach, expect, test, vi} from 'vitest'
import {runOnDevice} from '../../driver.ts'

beforeEach(() => {
  globalThis.gboardDevice.reset()
})

test.fails('Scenario: Backspace and Enter after foo', async (context) => {
  globalThis.gboardDevice.lostReads = [3, 3]
  vi.useFakeTimers()
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}, {type: 'enter'}],
  })
  await Promise.allSettled([running, vi.runAllTimersAsync()])
  const run = await running

  expect(run.text).toEqual('fo\n')
})

test.fails('Scenario: Enter after foo', async (context) => {
  const offline = {stdout: '', stderr: 'error: device offline\n', code: 1}
  globalThis.gboardDevice.adbAnswers = [
    {match: /dumpsys input_method/, answer: offline},
    {match: /dumpsys input_method/, answer: offline},
  ]
  globalThis.gboardDevice.getState = offline
  vi.useFakeTimers()
  const running = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  })
  await Promise.allSettled([running, vi.runAllTimersAsync()])
  const run = await running

  expect(run.text).toEqual('foo\n')
})
