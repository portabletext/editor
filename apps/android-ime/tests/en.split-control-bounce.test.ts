import {test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// A control with no editor, see `page/split.ts`: the editor's selection bounce on the split, into the new
// node and back, alone and after a replace. The cases record what Gboard did in their JSON artifacts and
// assert nothing.

test('Scenario: Typing kyou twice while the page moves the caret into an empty span after each you and back', async () => {
  await typeOnDevice({
    lang: 'en',
    page: 'split.html?mode=bounce&word=you',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })
})

test('Scenario: Typing kyou twice while the page replaces the text node under the caret to split off each you and moves the caret into it and back', async () => {
  await typeOnDevice({
    lang: 'en',
    page: 'split.html?mode=replace-bounce&word=you',
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
