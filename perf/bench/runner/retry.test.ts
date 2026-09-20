import {describe, expect, test} from 'vitest'
import {withSessionRetry} from './retry'

describe('withSessionRetry', () => {
  test('returns the result once a retry succeeds', async () => {
    const attempts: number[] = []
    let callCount = 0
    const result = await withSessionRetry({
      label: 'test session',
      run: async () => {
        callCount += 1
        if (callCount < 3) throw new Error(`transient failure ${callCount}`)
        return 'session result'
      },
      onFailure: (_error, attempt) => {
        attempts.push(attempt)
      },
    })

    expect(result).toBe('session result')
    expect(callCount).toBe(3)
    expect(attempts).toEqual([1, 2])
  })

  test('aborts after 3 consecutive failures', async () => {
    let callCount = 0
    const attempts: number[] = []

    await expect(
      withSessionRetry({
        label: 'plain session',
        run: async () => {
          callCount += 1
          throw new Error(`failure ${callCount}`)
        },
        onFailure: (_error, attempt) => {
          attempts.push(attempt)
        },
      }),
    ).rejects.toThrow(
      'plain session: 3 consecutive session failures (last: failure 3)',
    )

    expect(callCount).toBe(3)
    expect(attempts).toEqual([1, 2, 3])
  })
})
