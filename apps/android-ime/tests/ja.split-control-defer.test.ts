import {test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// A control with no editor, see `page/split.ts`: the `keep` split of each composing きょう, held back until
// its `compositionend`, so it splits whatever the composition committed. The cases record what Gboard did in
// their JSON artifacts and assert nothing. Word 1 may be committed as kana by Space, as Gboard does on a
// fresh field when it offers no 今日 yet.

test('Scenario: Typing kyou twice while the page splits off each composing きょう once its composition ends', async () => {
  await typeOnDevice({
    lang: 'ja',
    page: 'split.html?mode=defer&word=きょう',
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
