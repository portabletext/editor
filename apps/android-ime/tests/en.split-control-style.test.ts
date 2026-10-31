import {test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// A control with no editor, see `page/split.ts`. The cases record what Gboard did in their JSON artifacts
// and assert nothing, so every mode reports its text and events.

test('Scenario: Typing kyou twice while the page restyles the span around the caret when you completes', async () => {
  await typeOnDevice({
    lang: 'en',
    page: 'split.html?mode=style&word=you',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })
})
