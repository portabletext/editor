import {test, vi} from 'vitest'
import {runOnDevice} from '../../driver.ts'

for (const typed of ['_', '7']) {
  test.fails(`Scenario: inconclusive ${typed} cannot be an expected failure`, async (context) => {
    vi.useFakeTimers()
    gboardDevice.reset()
    gboardDevice.recordEvents = true
    gboardDevice.typedOverrides = [typed, typed]
    const typing = runOnDevice(context, {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: '',
      steps: [{type: 'compose', text: '-', commit: 'none'}],
    })
    const rejected = typing.catch((error: unknown) => {
      throw error
    })
    void rejected.catch(() => {})
    await vi.runAllTimersAsync()
    await rejected
    throw new Error('editor assertion failed')
  })
}
