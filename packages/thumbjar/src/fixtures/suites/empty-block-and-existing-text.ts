import {expect, test} from 'vitest'
import {typeOnDevice} from '../../driver.ts'

test.fails('Scenario: Typing kyou into an empty block', async () => {
  const typed = await typeOnDevice({
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    words: [{letters: 'kyou', candidate: '今日'}],
  })

  expect(typed.text).toEqual('今日')
})

test('Scenario: Typing kyou after existing text', async () => {
  const typed = await typeOnDevice({
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: 'x',
    words: [{letters: 'kyou', candidate: '今日'}],
  })

  expect(typed.text).toEqual('x今日')
})
