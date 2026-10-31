import {test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// A control with no editor, see `page/split.ts`. The cases record what Gboard did in their JSON artifacts
// and assert nothing, so every mode reports its text and events.

test('Scenario: Typing kyou twice while the page writes nothing under the caret', async () => {
  await typeOnDevice({
    lang: 'en',
    page: 'split.html?mode=none&word=you',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })
})

test('Scenario: Typing kyou twice while the page replaces the text node under the caret to split off each you', async () => {
  await typeOnDevice({
    lang: 'en',
    page: 'split.html?mode=replace&word=you',
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
