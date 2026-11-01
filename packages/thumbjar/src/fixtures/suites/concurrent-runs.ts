import {expect, test, vi} from 'vitest'
import {driverRuns, runOnDevice} from '../../driver.ts'

let releaseFirstAttempt: () => void
globalThis.holdFirstAttempt = new Promise<void>((resolve) => {
  releaseFirstAttempt = resolve
})

test.concurrent('Scenario: Pressing Enter in a concurrent test', async (context) => {
  const run = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  })
  // The other test's call is made while this one is still on the device.
  await vi.waitFor(() => expect(driverRuns.length).toEqual(2))
  releaseFirstAttempt()

  expect((await run).text).toEqual('foo')
})

test.concurrent('Scenario: Pressing Backspace in a concurrent test', async (context) => {
  const run = await runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'backspace'}],
  })

  expect(run.text).toEqual('foo')
})

test('Scenario: Each call drove the device on its own, under its own test', () => {
  expect({calls: globalThis.deviceCalls, runs: driverRuns}).toEqual({
    calls: [
      'start en-pressing-enter-in-a-concurrent-test',
      'end en-pressing-enter-in-a-concurrent-test',
      'start en-pressing-backspace-in-a-concurrent-test',
      'end en-pressing-backspace-in-a-concurrent-test',
    ],
    runs: [
      {
        test: 'Scenario: Pressing Enter in a concurrent test',
        fails: false,
        state: 'complete',
      },
      {
        test: 'Scenario: Pressing Backspace in a concurrent test',
        fails: false,
        state: 'complete',
      },
    ],
  })
})
