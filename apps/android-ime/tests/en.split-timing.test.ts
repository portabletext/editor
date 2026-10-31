import {test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// Times the editor's decoration split against Gboard's `input` events, see `page/split-timing.ts`, with the
// editor as on main and with the spike's restore boundary (`boundary=1`). The cases assert nothing: each JSON
// artifact holds the page's `splitTiming` log, with the stack of each selection write, and a fault saves it as
// `faultState`.

test('Scenario: Typing kyou twice while the page times each you decoration against its input', async () => {
  await typeOnDevice({
    lang: 'en',
    page: 'editor.html?decorate=you&timing=1',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })
})

test('Scenario: Typing kyou twice while the page times each you decoration against its input with the restore boundary', async () => {
  await typeOnDevice({
    lang: 'en',
    page: 'editor.html?decorate=you&timing=1&boundary=1',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })
})
