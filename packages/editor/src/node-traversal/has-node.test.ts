import {describe, expect, test} from 'vitest'
import {hasNode} from './has-node'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(hasNode.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('root level', () => {
    expect(hasNode(testbed.context, [0])).toBe(true)
  })

  test('deep path', () => {
    expect(hasNode(testbed.context, [4, 0, 0, 0, 0])).toBe(true)
  })

  test('out of bounds', () => {
    expect(hasNode(testbed.context, [99])).toBe(false)
  })

  test('empty path', () => {
    expect(hasNode(testbed.context, [])).toBe(false)
  })
})
