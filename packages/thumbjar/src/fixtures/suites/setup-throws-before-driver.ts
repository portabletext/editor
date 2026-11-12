import {beforeEach, describe, test} from 'vitest'
import {runOnDevice} from '../../driver.ts'

describe('Setup that throws', () => {
  beforeEach(() => {
    throw new Error('setup failed')
  })

  test.fails('Scenario: Typing after a setup that throws', async (context) => {
    await runOnDevice(context, {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    })
  })
})

test.fails('Scenario: Same name', async (context) => {
  await runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'foo',
    steps: [{type: 'enter'}],
  })
  throw new Error('the editor failed')
})

describe('Same name group', () => {
  beforeEach(() => {
    throw new Error('setup failed')
  })

  test.fails('Scenario: Same name', async (context) => {
    await runOnDevice(context, {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: 'foo',
      steps: [{type: 'enter'}],
    })
  })
})
