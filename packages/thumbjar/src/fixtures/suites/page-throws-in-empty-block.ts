import {expect, test, vi} from 'vitest'
import {typeOnDevice} from '../../driver.ts'

test.fails('Scenario: The editor throws while kyou is typed into an empty block', async () => {
  vi.useFakeTimers()
  const typing = typeOnDevice({
    lang: 'en',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'kyou'}],
  })
  await vi.runAllTimersAsync()

  expect((await typing).text).toEqual('kyou ')
})
