import {describe, expect, test} from 'vitest'
import {getBlock, isBlock} from './is-block'
import {
  createTextBlockDepthTestbed,
  textBlockDepths,
} from './node-traversal-testbed'

describe.each(textBlockDepths)(
  `${isBlock.name} with a compact path to a text block %s`,
  (depth) => {
    const testbed = createTextBlockDepthTestbed(depth)

    test('the full block path is a block and the full span path is not', () => {
      expect(isBlock(testbed.snapshot, testbed.blockPath)).toEqual(true)
      expect(isBlock(testbed.snapshot, testbed.spanPath)).toEqual(false)
    })

    test.each(testbed.compactSpanPaths)(
      'a compact span path ($form) is not a block',
      ({path}) => {
        expect(isBlock(testbed.snapshot, path)).toEqual(false)
      },
    )

    test.each(testbed.compactBlockPaths)(
      'a compact block path ($form) is not a block',
      ({path}) => {
        expect(isBlock(testbed.snapshot, path)).toEqual(false)
      },
    )
  },
)

describe.each(textBlockDepths)(
  `${getBlock.name} with a compact path to a text block %s`,
  (depth) => {
    const testbed = createTextBlockDepthTestbed(depth)

    test('the full block path returns the block', () => {
      expect(getBlock(testbed.snapshot, testbed.blockPath)).toEqual({
        node: testbed.textBlock,
        path: testbed.blockPath,
      })
    })

    test.each(testbed.compactBlockPaths)(
      'a compact block path ($form) returns no block',
      ({path}) => {
        expect(getBlock(testbed.snapshot, path)).toEqual(undefined)
      },
    )
  },
)
