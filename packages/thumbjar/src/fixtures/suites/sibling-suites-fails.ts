import {describe, expect, test} from 'vitest'
import {runOnDevice, type RunOnDeviceOptions} from '../../driver.ts'

const options: RunOnDeviceOptions = {
  keyboard: 'ja',
  url: 'http://localhost:8765/editor.html',
  prefix: 'foo',
  steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
}

let release: () => void
const released = new Promise<void>((resolve) => {
  release = resolve
})

describe.concurrent('first suite', () => {
  test.fails('Scenario: First type', {concurrent: false}, async (context) => {
    await released
    const typed = await runOnDevice(context, options)

    expect(typed.text).toEqual('bar')
  })
})

describe.concurrent('second suite', () => {
  test.fails('Scenario: Second type', {concurrent: false}, async (context) => {
    release()
    const typed = await runOnDevice(context, options)

    expect(typed.text).toEqual('bar')
  })
})
