import {expect, test} from 'vitest'
import {runOnDevice} from '../../driver.ts'

let startSibling: () => void
const siblingStarted = new Promise<void>((resolve) => {
  startSibling = resolve
})
let finishCall: () => void
const callFinished = new Promise<void>((resolve) => {
  finishCall = resolve
})

test.concurrent('Scenario: An unsupported case in a concurrent test skips that test', async (context) => {
  await siblingStarted
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
})

test.concurrent('Scenario: A concurrent test fails its own assertion', async () => {
  startSibling()
  await callFinished
  expect('foo').toEqual('bar')
})
