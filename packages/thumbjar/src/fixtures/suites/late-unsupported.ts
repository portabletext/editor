import {expect, test} from 'vitest'
import {runOnDevice} from '../../driver.ts'

let startNextTest: () => void
const nextTestStarted = new Promise<void>((resolve) => {
  startNextTest = resolve
})
let finishCall: () => void
const callFinished = new Promise<void>((resolve) => {
  finishCall = resolve
})

test.fails('Scenario: An unsupported case reached after the test timed out', async (context) => {
  await nextTestStarted
  try {
    await runOnDevice(context, {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: '',
      steps: [{type: 'compose', letters: '💥'}],
    })
  } finally {
    finishCall()
  }
}, 500)

test('Scenario: The next test fails its own assertion', async () => {
  startNextTest()
  await callFinished
  expect('foo').toEqual('bar')
})
