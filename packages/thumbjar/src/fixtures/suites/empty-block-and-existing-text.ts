import {expect, test} from 'vitest'
import {runOnDevice} from '../../driver.ts'

test.fails('Scenario: Typing kyou into an empty block', async (context) => {
  const typed = await runOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
  })

  expect(typed.text).toEqual('今日')
})

test('Scenario: Typing kyou after existing text', async (context) => {
  const typed = await runOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: 'x',
    steps: [{type: 'compose', letters: 'kyou', commit: {candidate: '今日'}}],
  })

  expect(typed.text).toEqual('x今日')
})
