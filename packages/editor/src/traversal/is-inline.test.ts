import {describe, expect, test} from 'vitest'
import {isInline} from './is-inline'
import {
  createTextBlockDepthTestbed,
  textBlockDepths,
} from './node-traversal-testbed'

describe.each(textBlockDepths)(
  `${isInline.name} with a compact path to a text block %s`,
  (depth) => {
    const testbed = createTextBlockDepthTestbed(depth)

    test('the full span path is inline and the full block path is not', () => {
      expect(isInline(testbed.snapshot, testbed.spanPath)).toEqual(true)
      expect(isInline(testbed.snapshot, testbed.blockPath)).toEqual(false)
    })

    test.each(testbed.compactSpanPaths)(
      'a compact span path ($form) is not inline',
      ({path}) => {
        expect(isInline(testbed.snapshot, path)).toEqual(false)
      },
    )

    test.each(testbed.compactBlockPaths)(
      'a compact block path ($form) is not inline',
      ({path}) => {
        expect(isInline(testbed.snapshot, path)).toEqual(false)
      },
    )
  },
)
