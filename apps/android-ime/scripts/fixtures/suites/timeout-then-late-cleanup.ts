import {expect, test, vi} from 'vitest'
import {driverRuns, typeOnDevice} from '../../driver.ts'

test.fails('Scenario: Typing kyou into an empty block times out while Chrome stops', async () => {
  const typed = await typeOnDevice({
    lang: 'ja',
    page: 'editor.html',
    prefix: '',
    words: [{letters: 'kyou', candidate: '今日'}],
  })

  expect(typed.text).toEqual('今日')
}, 500)

test('Scenario: Chrome finishes stopping during the next test', async () => {
  globalThis.finishChromeStop()
  await vi.waitFor(() => expect(globalThis.chromeStopReturned).toEqual(true))

  expect(driverRuns.map((run) => run.state)).toEqual(['aborted'])
})
