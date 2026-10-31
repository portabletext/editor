import {test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// The editor with the spike's restore boundary (`boundary=1`) and no timing instrumentation, so no
// `Selection` method is wrapped: `en.split-timing.test.ts` kept the Space with the boundary while the
// uninstrumented page lost it. The case asserts nothing and records what Gboard did in its JSON artifact.

test('Scenario: Typing kyou twice while the page decorates each you with the restore boundary', async () => {
  await typeOnDevice({
    lang: 'en',
    page: 'editor.html?decorate=you&boundary=1',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })
})
