import {typeOnDevice} from 'thumbjar'
import {expect, test} from 'vitest'

test('Scenario: Typing kyou twice into a plain contenteditable', async (context) => {
  const typed = await typeOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/plain.html',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })

  // A word thumbjar committed with Space may stay kana or be converted by it, but a word it committed by
  // tapping the `今日` candidate must read `今日`.
  const firstWord = typed.picked[0] === 'space' ? '(今日|きょう)' : '今日'
  const secondWord = typed.picked[1] === 'space' ? '(今日|きょう)' : '今日'
  expect(typed.text).toMatch(new RegExp(`^${firstWord}${secondWord}$`))
  expect({
    nested: typed.nested,
    compositionstartPerWord: typed.compositionstartPerWord,
  }).toEqual({nested: 0, compositionstartPerWord: [1, 1]})
})

test('Scenario: Typing kyou twice into an empty block', async (context) => {
  const typed = await typeOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })

  const firstWord = typed.picked[0] === 'space' ? '(今日|きょう)' : '今日'
  const secondWord = typed.picked[1] === 'space' ? '(今日|きょう)' : '今日'
  expect(typed.text).toMatch(new RegExp(`^${firstWord}${secondWord}$`))
  expect({
    nested: typed.nested,
    compositionstartPerWord: typed.compositionstartPerWord,
  }).toEqual({nested: 0, compositionstartPerWord: [1, 1]})
})

test('Scenario: Typing kyou twice after existing text', async (context) => {
  const typed = await typeOnDevice(context, {
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: 'x',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })

  const firstWord = typed.picked[0] === 'space' ? '(今日|きょう)' : '今日'
  const secondWord = typed.picked[1] === 'space' ? '(今日|きょう)' : '今日'
  expect(typed.text).toMatch(new RegExp(`^x${firstWord}${secondWord}$`))
  expect({
    nested: typed.nested,
    compositionstartPerWord: typed.compositionstartPerWord,
  }).toEqual({nested: 0, compositionstartPerWord: [1, 1]})
})
