import {describe, expect, test} from 'vitest'
import {withDriverRetry} from './driver.ts'

describe(withDriverRetry.name, () => {
  test('a driver fault restarts and types once more', async () => {
    const calls: string[] = []

    const result = await withDriverRetry({
      name: 'ja-typing',
      attempt: async (attempt) => {
        calls.push(`attempt ${attempt}`)
        if (attempt === 1) throw new Error('Gboard window did not appear')
        return 'typed'
      },
      restart: async () => {
        calls.push('restart')
      },
    })

    expect({result, calls}).toEqual({
      result: 'typed',
      calls: ['attempt 1', 'restart', 'attempt 2'],
    })
  })

  test('a second driver fault is not retried again', async () => {
    const calls: string[] = []

    await expect(
      withDriverRetry({
        name: 'ja-typing',
        attempt: async (attempt) => {
          calls.push(`attempt ${attempt}`)
          throw new Error(`mistap ${attempt}`)
        },
        restart: async () => {
          calls.push('restart')
        },
      }),
    ).rejects.toThrow('mistap 2')
    expect(calls).toEqual(['attempt 1', 'restart', 'attempt 2'])
  })

  test('a fault is not retried while an earlier process may still touch the device', async () => {
    const calls: string[] = []

    await expect(
      withDriverRetry({
        name: 'ja-typing',
        attempt: async (attempt) => {
          calls.push(`attempt ${attempt}`)
          throw new Error('adb shell input text still runs after SIGKILL')
        },
        restart: async () => {
          calls.push('restart')
        },
        canRetry: () => false,
      }),
    ).rejects.toThrow('adb shell input text still runs after SIGKILL')
    expect(calls).toEqual(['attempt 1'])
  })

  test('a wrong editor result is returned once and never retried', async () => {
    const calls: string[] = []

    const typed = await withDriverRetry({
      name: 'ja-typing',
      attempt: async (attempt) => {
        calls.push(`attempt ${attempt}`)
        return {text: 'ｋ用今日', nested: 1}
      },
      restart: async () => {
        calls.push('restart')
      },
    })

    expect({typed, calls}).toEqual({
      typed: {text: 'ｋ用今日', nested: 1},
      calls: ['attempt 1'],
    })
  })
})
