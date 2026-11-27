// thumbjar-test-count: 3
import {runOnDevice} from 'thumbjar'
import {expect, inject, test} from 'vitest'

test('Scenario: Typing kyou twice into a plain contenteditable', async (context) => {
  const run = await runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/plain.html',
    prefix: '',
    steps: [
      {type: 'compose', letters: 'kyou', commit: 'space'},
      {type: 'compose', letters: 'kyou', commit: 'space'},
    ],
  })

  // Chrome ends a plain `contenteditable` with a non-breaking space, and sometimes drops it.
  expect(run.text).toBeOneOf(['Kyou kyou ', 'Kyou kyou'])
})

// On iOS the editor leaves the first word of an empty block lowercase (`kyou kyou `). Drop `test.fails` once it capitalises.
;test(
  'Scenario: Typing kyou twice into an empty block',
  async (context) => {
    const run = await runOnDevice(context, {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: '',
      steps: [
        {type: 'compose', letters: 'kyou', commit: 'space'},
        {type: 'compose', letters: 'kyou', commit: 'space'},
      ],
    })

    expect(run.text).toEqual('Kyou kyou ')
  },
)

test('Scenario: Typing kyou twice after existing text', async (context) => {
  const run = await runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'x',
    steps: [
      {type: 'compose', letters: 'kyou', commit: 'space'},
      {type: 'compose', letters: 'kyou', commit: 'space'},
    ],
  })

  expect(run.text).toEqual('xkyou kyou ')
})
