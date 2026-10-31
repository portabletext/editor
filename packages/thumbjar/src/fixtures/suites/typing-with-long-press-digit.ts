import {expect, test, vi} from 'vitest'
import {typeOnDevice} from '../../driver.ts'

test('Scenario: A long press types a digit on the first attempt', async () => {
  vi.useFakeTimers()
  globalThis.pageTexts = ['K7ou ', 'Kyou ']
  const typing = typeOnDevice({
    keyboard: 'en',
    url: 'http://localhost:8765/plain.html',
    prefix: '',
    words: [{letters: 'kyou'}],
  })
  await vi.runAllTimersAsync()

  expect((await typing).text).toEqual('Kyou ')
})

test('Scenario: A digit the prefix already holds is an editor result', async () => {
  vi.useFakeTimers()
  globalThis.pageTexts = ['x7kyou ', 'x7kyou ']
  const typing = typeOnDevice({
    keyboard: 'en',
    url: 'http://localhost:8765/editor.html',
    prefix: 'x7',
    words: [{letters: 'kyou'}],
  })
  await vi.runAllTimersAsync()

  expect((await typing).text).toEqual('x7kyou ')
})

test('Scenario: A digit on both attempts fails the test as a driver fault', async () => {
  vi.useFakeTimers()
  globalThis.pageTexts = ['K7ou ', 'K7ou ']
  const typing = typeOnDevice({
    keyboard: 'en',
    url: 'http://localhost:8765/plain.html',
    prefix: '',
    words: [{letters: 'kyou'}],
  }).catch((error: Error) => error.message)
  await vi.runAllTimersAsync()

  expect(await typing).toEqual(
    "mistap: digit 7 in typed text 'K7ou ' that neither the prefix nor the letters hold",
  )
})
