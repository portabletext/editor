import {typeOnDevice} from 'thumbjar'
import {expect, test} from 'vitest'

test('Scenario: Typing kyou twice into a plain contenteditable', async () => {
  const typed = await typeOnDevice({
    keyboard: 'en',
    url: 'http://localhost:8765/plain.html',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })

  // Chrome ends a plain `contenteditable` with a non-breaking space, and sometimes drops it.
  expect(typed.text).toBeOneOf(['Kyou kyou ', 'Kyou kyou'])
})

test('Scenario: Typing kyou twice into an empty block', async () => {
  const typed = await typeOnDevice({
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })

  expect(typed.text).toEqual('Kyou kyou ')
})

test('Scenario: Typing kyou twice after existing text', async () => {
  const typed = await typeOnDevice({
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'x',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })

  expect(typed.text).toEqual('xkyou kyou ')
})
