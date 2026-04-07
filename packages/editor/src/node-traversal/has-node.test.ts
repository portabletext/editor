import {describe, expect, test} from 'vitest'
import {hasNode} from './has-node'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

describe(hasNode.name, () => {
  const testbed = createNodeTraversalTestbed()

  test('root level', () => {
    expect(hasNode(testbed.context, [{_key: 'k3'}])).toBe(true)
  })

  test('deep path', () => {
    expect(
      hasNode(testbed.context, [
        {_key: 'k26'},
        'rows',
        {_key: 'k21'},
        'cells',
        {_key: 'k17'},
        'content',
        {_key: 'k14'},
        'children',
        {_key: 'k12'},
      ]),
    ).toBe(true)
  })

  test('out of bounds', () => {
    expect(hasNode(testbed.context, [{_key: 'nonexistent'}])).toBe(false)
  })

  test('empty path', () => {
    expect(hasNode(testbed.context, [])).toBe(false)
  })
})
