import {test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// A control with no editor, see `page/split.ts`: the `keep` split, held back while a composition is open.
// English Gboard does not compose, so the split lands in the `input` that completes each you, as in `keep`.
// The cases record what Gboard did in their JSON artifacts and assert nothing.

test('Scenario: Typing kyou twice while the page splits off each you once no composition is open', async () => {
  await typeOnDevice({
    lang: 'en',
    page: 'split.html?mode=defer&word=you',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })
})

test('Scenario: Typing kyou twice while the page splits off each you and keeps the text node under the caret', async () => {
  await typeOnDevice({
    lang: 'en',
    page: 'split.html?mode=keep&word=you',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })
})

test('Scenario: Typing kyou twice while the page writes nothing under the caret', async () => {
  await typeOnDevice({
    lang: 'en',
    page: 'split.html?mode=none&word=you',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })
})
