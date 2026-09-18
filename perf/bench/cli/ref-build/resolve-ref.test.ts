import {describe, expect, test} from 'vitest'
import {REPO_ROOT} from '../bench-root'
import {resolveRef} from './resolve-ref'

describe('resolveRef', () => {
  test('resolves HEAD to a full 40-char sha', () => {
    const sha = resolveRef('HEAD', REPO_ROOT)
    expect(sha).toMatch(/^[0-9a-f]{40}$/)
  })

  test('resolves HEAD and HEAD~0 to the same sha', () => {
    expect(resolveRef('HEAD', REPO_ROOT)).toBe(resolveRef('HEAD~0', REPO_ROOT))
  })

  test('throws, naming the ref, when it does not resolve to a commit', () => {
    expect(() => resolveRef('not-a-real-ref-xyz', REPO_ROOT)).toThrow(
      /"not-a-real-ref-xyz"/,
    )
  })
})
