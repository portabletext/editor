import {test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// Times the editor's decoration split against Gboard's `input` events, see `page/split-timing.ts`. The case
// asserts nothing: its JSON artifact holds the page's `splitTiming` log. The decoration covers the composing
// きょう, the page `ja.crashes.test.ts` crashes on, and word 1 may be committed as kana by Space, as Gboard
// does on a fresh field when it offers no 今日 yet.

test('Scenario: Typing kyou twice while the page times each composing きょう decoration against its input', async () => {
  await typeOnDevice({
    lang: 'ja',
    page: 'editor.html?decorate=きょう&timing=1',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })
})
