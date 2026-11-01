import {typeOnDevice} from 'thumbjar'
import {expect, test} from 'vitest'

test('Scenario: Typing kyou twice into a plain textarea', async () => {
  const typed = await typeOnDevice({
    keyboard: 'en',
    url: 'http://localhost:8765/textarea.html',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })

  expect(typed.text).toEqual('Kyou kyou ')
})
