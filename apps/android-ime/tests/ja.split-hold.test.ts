import {test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// The editor with the spike's composition hold (`hold=1`): while Gboard composes, the leaf it composes in keeps
// the decorations it had when the composition started, so the composing きょう is not split into a decorated
// leaf until `compositionend`. The second case adds the restore boundary, since a decoration change the hold
// renders during the composition is a `Text`-only commit that `restoreDOM` would otherwise undo. The cases
// assert nothing and record what Gboard did in their JSON artifacts. Word 1 may be committed as kana by Space,
// as Gboard does on a fresh field when it offers no 今日 yet.

test('Scenario: Typing kyou twice while the page decorates each composing きょう with the composition hold', async () => {
  await typeOnDevice({
    lang: 'ja',
    page: 'editor.html?decorate=きょう&hold=1',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })
})

test('Scenario: Typing kyou twice while the page decorates each composing きょう with the composition hold and the restore boundary', async () => {
  await typeOnDevice({
    lang: 'ja',
    page: 'editor.html?decorate=きょう&hold=1&boundary=1',
    prefix: '',
    words: [
      {letters: 'kyou', candidate: '今日'},
      {letters: 'kyou', candidate: '今日'},
    ],
  })
})
