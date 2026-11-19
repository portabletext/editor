import {runOnDevice} from 'thumbjar'
import {expect, test} from 'vitest'

test('Scenario: Typing kyou twice into a plain textarea', async (context) => {
  const run = await runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/textarea.html',
    prefix: '',
    steps: [
      {type: 'compose', letters: 'kyou', commit: 'space'},
      {type: 'compose', letters: 'kyou', commit: 'space'},
    ],
  })

  expect(run.text).toEqual('Kyou kyou ')
})
