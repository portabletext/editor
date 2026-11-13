import {beforeEach, describe, expect, test, vi} from 'vitest'
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

test('Scenario: Passed', async (context) => {
  const running = runOnDevice(context, enterAfterFoo)
  await Promise.allSettled([running, vi.runAllTimersAsync()])
  const run = await running

  expect(run.text).toEqual('foo\n')
})

test('Scenario: Failed', async (context) => {
  const running = runOnDevice(context, enterAfterFoo)
  await Promise.allSettled([running, vi.runAllTimersAsync()])
  const run = await running

  expect(run.text).toEqual('foo')
})

test.fails('Scenario: Expected failure', async (context) => {
  const running = runOnDevice(context, enterAfterFoo)
  await Promise.allSettled([running, vi.runAllTimersAsync()])
  const run = await running

  expect(run.text).toEqual('foo')
})

test('Scenario: Inconclusive after input', async (context) => {
  globalThis.gboardDevice.lostReads = [2, 2]
  const running = runOnDevice(context, enterAfterFoo)
  await Promise.allSettled([running, vi.runAllTimersAsync()])
  await running
})

test('Scenario: Device offline', async (context) => {
  const offline = {stdout: '', stderr: 'error: device offline\n', code: 1}
  globalThis.gboardDevice.adbAnswers = [
    {match: /dumpsys input_method/, answer: offline},
    {match: /dumpsys input_method/, answer: offline},
  ]
  globalThis.gboardDevice.getState = offline
  const running = runOnDevice(context, enterAfterFoo)
  await Promise.allSettled([running, vi.runAllTimersAsync()])
  await running
})

test('Scenario: Driver fault', async (context) => {
  globalThis.gboardDevice.lostReads = [1, 1]
  const running = runOnDevice(context, enterAfterFoo)
  await Promise.allSettled([running, vi.runAllTimersAsync()])
  await running
})

test('Scenario: Inconclusive while the device answered', async (context) => {
  globalThis.gboardDevice.lostReads = [1, 1]
  globalThis.gboardDevice.adbAnswers = [
    {match: /pidof com\.android\.chrome/, answer: 'hangs'},
  ]
  const running = runOnDevice(context, enterAfterFoo)
  await Promise.allSettled([running, vi.runAllTimersAsync()])
  await running
})

test('Scenario: Inconclusive while the device was not checked', async (context) => {
  globalThis.gboardDevice.lostReads = [1, 1]
  globalThis.gboardDevice.adbAnswers = [
    {match: /pidof com\.android\.chrome/, answer: 'hangs'},
  ]
  globalThis.gboardDevice.getState = 'hangs'
  const running = runOnDevice(context, enterAfterFoo)
  await Promise.allSettled([running, vi.runAllTimersAsync()])
  await running
})

test('Scenario: Passed without a driver call', () => {
  expect(1 + 1).toEqual(2)
})

test('Scenario: Passed on its last call after a driver fault', async (context) => {
  globalThis.gboardDevice.lostReads = [1, 1]
  const faulting = runOnDevice(context, enterAfterFoo).catch(() => undefined)
  await Promise.allSettled([faulting, vi.runAllTimersAsync()])
  await faulting
  globalThis.gboardDevice.reset()
  const running = runOnDevice(context, enterAfterFoo)
  await Promise.allSettled([running, vi.runAllTimersAsync()])
  const run = await running

  expect(run.text).toEqual('foo\n')
})

describe('A group', () => {
  test('Scenario: Passed in a group', async (context) => {
    const running = runOnDevice(context, enterAfterFoo)
    await Promise.allSettled([running, vi.runAllTimersAsync()])
    const run = await running

    expect(run.text).toEqual('foo\n')
  })

  test.fails('Scenario: Expected failure in a group', async (context) => {
    const running = runOnDevice(context, enterAfterFoo)
    await Promise.allSettled([running, vi.runAllTimersAsync()])
    const run = await running

    expect(run.text).toEqual('foo')
  })
})

describe('Another group', () => {
  test('Scenario: Passed in a group', async (context) => {
    globalThis.gboardDevice.lostReads = [2, 2]
    const running = runOnDevice(context, enterAfterFoo)
    await Promise.allSettled([running, vi.runAllTimersAsync()])
    await running
  })
})

describe('A group that runs nothing', () => {
  test.skip('Scenario: Skipped', () => {})

  test.todo('Scenario: Todo')

  test('Scenario: A case Gboard cannot drive', async (context) => {
    await runOnDevice(context, {
      ...enterAfterFoo,
      steps: [{type: 'compose', letters: '💥'}],
    })
  })
})
