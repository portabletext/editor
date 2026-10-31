import {test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// Times the editor's decoration split against Gboard's `input` events, see `page/split-timing.ts`. The case
// asserts nothing: its JSON artifact holds the page's `splitTiming` log.

test('Scenario: Typing kyou twice while the page times each you decoration against its input', async () => {
  await typeOnDevice({
    lang: 'en',
    page: 'editor.html?decorate=you&timing=1',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })
})
