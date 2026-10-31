import {test} from 'vitest'
import {typeOnDevice} from '../scripts/driver.ts'

// The editor with the spike's composition hold (`hold=1`), alone and with the restore boundary. English Gboard
// fires no `compositionstart` on these devices, so the hold never engages and each case should match its page
// without `hold=1`: `en.crashes` for the first, `en.split-boundary` for the second. The cases assert nothing and
// record what Gboard did in their JSON artifacts.

test('Scenario: Typing kyou twice while the page decorates each you with the composition hold', async () => {
  await typeOnDevice({
    lang: 'en',
    page: 'editor.html?decorate=you&hold=1',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })
})

test('Scenario: Typing kyou twice while the page decorates each you with the composition hold and the restore boundary', async () => {
  await typeOnDevice({
    lang: 'en',
    page: 'editor.html?decorate=you&hold=1&boundary=1',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })
})
