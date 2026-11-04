import {expect, test} from 'vitest'
import {driverRuns, runOnDevice} from '../../driver.ts'

let startNextTest: () => void
const nextTestStarted = new Promise<void>((resolve) => {
  startNextTest = resolve
})
let finishCall: () => void
const callFinished = new Promise<void>((resolve) => {
  finishCall = resolve
})
let lateCall: unknown

test.fails('Scenario: A case reached after the test timed out', async (context) => {
  await nextTestStarted
  try {
    lateCall = await runOnDevice(context, {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    }).catch((error: unknown) => error)
  } finally {
    finishCall()
  }
}, 500)

test('Scenario: The next test sees no device call and no run of its own', async () => {
  startNextTest()
  await callFinished

  expect({
    lateCall: (lateCall as Error).message,
    calls: globalThis.deviceCalls,
    runs: driverRuns,
  }).toEqual({
    lateCall:
      'Test timed out in 500ms.\nIf this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".',
    calls: [],
    runs: [
      {
        test: 'Scenario: A case reached after the test timed out',
        fails: true,
        state: 'aborted',
      },
    ],
  })
})
