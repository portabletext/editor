import {test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// A control with no editor, see `page/split.ts`. The cases record what Gboard did in their JSON artifacts
// and assert nothing, so every mode reports its text and events. Word 1 may be committed as kana by Space, as
// Gboard does on a fresh field when it offers no 今日 yet.

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

test('Scenario: Typing kyou twice while the page replaces the text node under the caret to split off the composing きょう', async () => {
  await typeOnDevice({
    lang: 'ja',
    page: 'split.html?mode=replace&word=きょう',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })
})

test('Scenario: Typing kyou twice while the page replaces the text node under the caret to split off the committed 今日', async () => {
  await typeOnDevice({
    lang: 'ja',
    page: 'split.html?mode=replace&word=今日',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })
})
