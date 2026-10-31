import {test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// A control with no editor, see `page/split.ts`: the editor's selection bounce on the split, into the new
// node and back, alone and after a replace, on the composing きょう. The cases record what Gboard did in their
// JSON artifacts and assert nothing. Word 1 may be committed as kana by Space, as Gboard does on a fresh
// field when it offers no 今日 yet.

test('Scenario: Typing kyou twice while the page moves the caret into an empty span after the composing きょう and back', async () => {
  await typeOnDevice({
    lang: 'ja',
    page: 'split.html?mode=bounce&word=きょう',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })
})

test('Scenario: Typing kyou twice while the page replaces the text node under the caret to split off the composing きょう and moves the caret into it and back', async () => {
  await typeOnDevice({
    lang: 'ja',
    page: 'split.html?mode=replace-bounce&word=きょう',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })
})

test('Scenario: Typing kyou twice while the page writes nothing under the caret', async () => {
  await typeOnDevice({
    lang: 'ja',
    page: 'split.html?mode=none&word=きょう',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })
})
