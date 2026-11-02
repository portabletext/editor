import {describe, expect, test, vi} from 'vitest'
import {runOnDevice} from '../../driver.ts'

describe('outer', () => {
  describe('inner', () => {
    test('Scenario: Passed', () => {
      expect(1).toEqual(1)
    })

    test.fails('Scenario: Expected failure', () => {
      expect(1).toEqual(2)
    })

    test.skip('Scenario: Skipped', () => {})

    test.todo('Scenario: Todo')

    test('Scenario: Skipped as it runs', (context) => {
      context.skip('unsupported')
    })
  })
})

let attempts = 0
test('Scenario: Passed on its retry', {retry: 1}, () => {
  attempts += 1
  expect(attempts).toEqual(2)
})

describe('first', () => {
  test('Scenario: Same name', async (context) => {
    globalThis.gboardDevice.reset()
    vi.useFakeTimers()
    globalThis.gboardDevice.rejectedTaps = [2]
    const running = runOnDevice(context, {
      keyboard: 'en',
      url: 'http://localhost:8765/editor.html',
      prefix: '',
      steps: [{type: 'enter'}],
    }).catch(() => {})
    await vi.runAllTimersAsync()
    await running
  })
})

describe('second', () => {
  test('Scenario: Same name', () => {
    expect(1).toEqual(1)
  })
})
