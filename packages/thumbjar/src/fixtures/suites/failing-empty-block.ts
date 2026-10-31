import {expect, test} from 'vitest'
import {typeOnDevice} from '../../driver.ts'

test.fails('Scenario: Typing kyou into an empty block', async () => {
  const typed = await typeOnDevice({
    lang: 'ja',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'kyou', candidate: '今日'}],
  })

  expect(typed.text).toEqual('今日')
})
