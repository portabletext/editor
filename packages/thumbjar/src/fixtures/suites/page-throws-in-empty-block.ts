import {expect, test, vi} from 'vitest'
import {typeOnDevice} from '../../driver.ts'

test.fails('Scenario: The editor throws while kyou is typed into an empty block', async () => {
  vi.useFakeTimers()
  const typing = typeOnDevice({
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: '',
    words: [{letters: 'kyou'}],
  })
  await vi.runAllTimersAsync()

  expect((await typing).text).toEqual('kyou ')
})
