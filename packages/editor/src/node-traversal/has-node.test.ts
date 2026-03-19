import {describe, expect, test} from 'vitest'
import {hasNode} from './has-node'
import {createTestbed} from './testbed'

describe(hasNode.name, () => {
  const testbed = createTestbed()

  test('root level', () => {
    expect(hasNode(testbed.root, [0], testbed.schema)).toBe(true)
  })

  test('deep path', () => {
    expect(hasNode(testbed.root, [4, 0, 0, 0, 0], testbed.schema)).toBe(true)
  })

  test('out of bounds', () => {
    expect(hasNode(testbed.root, [99], testbed.schema)).toBe(false)
  })

  test('empty path', () => {
    expect(hasNode(testbed.root, [], testbed.schema)).toBe(false)
  })
})
