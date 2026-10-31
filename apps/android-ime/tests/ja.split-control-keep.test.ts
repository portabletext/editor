import {test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// A control with no editor, see `page/split.ts`. The cases record what Gboard did in their JSON artifacts
// and assert nothing, so every mode reports its text and events. Word 1 may be committed as kana by Space, as
// Gboard does on a fresh field when it offers no 今日 yet.

test('Scenario: Typing kyou twice while the page splits off the composing きょう and keeps the text node under the caret', async () => {
  await typeOnDevice({
    lang: 'ja',
    page: 'split.html?mode=keep&word=きょう',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })
})

test('Scenario: Typing kyou twice while the page splits off the committed 今日 and keeps the text node under the caret', async () => {
  await typeOnDevice({
    lang: 'ja',
    page: 'split.html?mode=keep&word=今日',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })
})
