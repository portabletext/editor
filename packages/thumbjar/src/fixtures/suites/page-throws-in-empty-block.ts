import {expect, test, vi} from 'vitest'
import {runOnDevice} from '../../driver.ts'

test.fails('Scenario: The editor throws while kyou is typed into an empty block', async (context) => {
  vi.useFakeTimers()
  const typing = runOnDevice(context, {
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    steps: [{type: 'compose', letters: 'kyou'}],
  })
  await Promise.allSettled([typing, vi.runAllTimersAsync()])

  expect((await typing).text).toEqual('kyou ')
})
