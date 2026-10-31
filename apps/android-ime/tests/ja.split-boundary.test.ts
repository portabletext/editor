import {test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// The editor with the spike's restore boundary (`boundary=1`) and no timing instrumentation, so no
// `Selection` method is wrapped, on the decoration `ja.split-timing.test.ts` times. The case asserts nothing
// and records what Gboard did in its JSON artifact. Word 1 may be committed as kana by Space, as Gboard does
// on a fresh field when it offers no 今日 yet.

test('Scenario: Typing kyou twice while the page decorates each composing きょう with the restore boundary', async () => {
  await typeOnDevice({
    lang: 'ja',
    page: 'editor.html?decorate=きょう&boundary=1',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })
})
