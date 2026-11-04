import {typeOnDevice} from 'thumbjar'
import {expect, test} from 'vitest'

test('Scenario: Typing kyou twice into a plain contenteditable', async () => {
  const typed = await typeOnDevice({
    keyboard: 'ja',
    url: 'http://localhost:8765/plain.html',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })

  // Gboard sometimes commits a word as kana before its conversion candidates load, and the candidates
  // can load between the two words, so each word is either 今日 or きょう in every test here.
  expect(typed.text).toMatch(/^(今日|きょう){2}$/)
  expect({
    nested: typed.nested,
    compositionstartPerWord: typed.compositionstartPerWord,
  }).toEqual({nested: 0, compositionstartPerWord: [1, 1]})
})

test('Scenario: Typing kyou twice into an empty block', async () => {
  const typed = await typeOnDevice({
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })

  expect(typed.text).toMatch(/^(今日|きょう){2}$/)
  expect({
    nested: typed.nested,
    compositionstartPerWord: typed.compositionstartPerWord,
  }).toEqual({nested: 0, compositionstartPerWord: [1, 1]})
})

test('Scenario: Typing kyou twice after existing text', async () => {
  const typed = await typeOnDevice({
    keyboard: 'ja',
    url: 'http://localhost:8765/editor.html',
    prefix: 'x',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })

  expect(typed.text).toMatch(/^x(今日|きょう){2}$/)
  expect({
    nested: typed.nested,
    compositionstartPerWord: typed.compositionstartPerWord,
  }).toEqual({nested: 0, compositionstartPerWord: [1, 1]})
})
