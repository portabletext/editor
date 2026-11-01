import {expect, test} from 'vitest'
import {driverRuns, runOnDevice} from '../../driver.ts'
import type {Step} from '../../steps.ts'

test('Scenario: A call without the test context throws before its steps are checked', async () => {
  await expect(
    runOnDevice(undefined as never, {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: '',
      steps: [{type: 'compose', letters: '💥'}],
    }),
  ).rejects.toThrow(
    '`runOnDevice` takes the context Vitest passes to the test first: `runOnDevice(context, options)`',
  )
})

test('Scenario: A call with its options first throws before its steps are checked', async () => {
  const options = {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', letters: '💥'}],
  }
  // The call before `runOnDevice` took the test context.
  const call = runOnDevice as unknown as (
    options: unknown,
  ) => ReturnType<typeof runOnDevice>

  await expect(call(options)).rejects.toThrow(
    '`runOnDevice` takes the context Vitest passes to the test first: `runOnDevice(context, options)`',
  )
})

test('Scenario: Pressing Enter after a driver fault', async (context) => {
  const run = await runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  })

  expect({text: run.text, calls: globalThis.deviceCalls}).toEqual({
    text: 'foo\n',
    calls: [
      'attempt 1',
      'close chrome',
      'attempt 2',
      'close chrome',
      'clear tabs',
    ],
  })
})

test('Scenario: A candidate on the English keyboard is unsupported and never reaches the device', async (context) => {
  await runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [
      {type: 'compose', letters: 'kyou', commit: {candidate: '今日'}},
      {type: 'enter'},
    ],
  })
})

test('Scenario: Letters without a key, after a step Gboard drives, are unsupported and never reach the device', async (context) => {
  await runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'enter'}, {type: 'compose', letters: '💥'}],
  })
})

test.fails('Scenario: An empty slot before a step Gboard drives is unsupported and never reaches the device', async (context) => {
  const steps = new Array<Step>(2)
  steps[1] = {type: 'enter'}
  await runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps,
  })
})

test('Scenario: The device saw only the case Gboard can drive', () => {
  expect({
    calls: globalThis.deviceCalls,
    runs: driverRuns.map((run) => run.test),
  }).toEqual({
    calls: [
      'attempt 1',
      'close chrome',
      'attempt 2',
      'close chrome',
      'clear tabs',
    ],
    runs: ['Scenario: Pressing Enter after a driver fault'],
  })
})
