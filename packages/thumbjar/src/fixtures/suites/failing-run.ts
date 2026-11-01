import {expect, test} from 'vitest'
import {runOnDevice} from '../../driver.ts'

test.fails('Scenario: Pressing Enter in an empty block', async (context) => {
  const run = await runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'enter'}],
  })

  expect(run.text).toEqual('\n')
})
