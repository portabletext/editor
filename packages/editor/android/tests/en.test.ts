// thumbjar-test-count: 3
import {typeOnDevice} from 'thumbjar'
import {expect, inject, test} from 'vitest'

test('Scenario: Typing kyou twice into a plain contenteditable', async (context) => {
  const typed = await typeOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/plain.html',
    prefix: '',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })

  // Chrome ends a plain `contenteditable` with a non-breaking space, and sometimes drops it.
  expect(typed.text).toBeOneOf(['Kyou kyou ', 'Kyou kyou'])
})

// On iOS the editor leaves the first word of an empty block lowercase (`kyou kyou `). Drop `test.fails` once it capitalises.
;(inject('thumbjarDevice') === 'ios' ? test.fails : test)(
  'Scenario: Typing kyou twice into an empty block',
  async (context) => {
    const typed = await typeOnDevice(context, {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: '',
      words: [{letters: 'kyou'}, {letters: 'kyou'}],
    })

    expect(typed.text).toEqual('Kyou kyou ')
  },
)

test('Scenario: Typing kyou twice after existing text', async (context) => {
  const typed = await typeOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'x',
    words: [{letters: 'kyou'}, {letters: 'kyou'}],
  })

  expect(typed.text).toEqual('xkyou kyou ')
})
