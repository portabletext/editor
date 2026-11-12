import {beforeEach, expect, test, vi} from 'vitest'
import {runOnDevice} from '../../driver.ts'
import type {RunOnDeviceOptions} from '../../steps.ts'

const enterAfterFoo: RunOnDeviceOptions = {
  keyboard: 'en',
  url: 'http://localhost:8765/editor.html',
  prefix: 'foo',
  steps: [{type: 'enter'}],
}

beforeEach(() => {
  globalThis.gboardDevice.reset()
  vi.useFakeTimers()
})

test('Scenario: Ordinary failure', async (context) => {
  const running = runOnDevice(context, enterAfterFoo)
  await vi.runAllTimersAsync()
  const run = await running

  expect(run.text).toEqual('foo')
})

test.fails('Scenario: Expected failure', async (context) => {
  const running = runOnDevice(context, enterAfterFoo)
  await vi.runAllTimersAsync()
  const run = await running

  expect(run.text).toEqual('foo')
})

test.fails('Scenario: Unexpected pass', async (context) => {
  const running = runOnDevice(context, enterAfterFoo)
  await vi.runAllTimersAsync()
  const run = await running

  expect(run.text).toEqual('foo\n')
})
