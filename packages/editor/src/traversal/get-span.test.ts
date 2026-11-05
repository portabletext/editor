import {describe, expect, test} from 'vitest'
import {getSpan} from './get-span'
import {
  createTextBlockDepthTestbed,
  textBlockDepths,
} from './node-traversal-testbed'

describe.each(textBlockDepths)(
  `${getSpan.name} with a compact path to a text block %s`,
  (depth) => {
    const testbed = createTextBlockDepthTestbed(depth)

    test('the full span path returns the span', () => {
      expect(getSpan(testbed.snapshot, testbed.spanPath)).toEqual({
        node: testbed.fooSpan,
        path: testbed.spanPath,
      })
    })

    test.each(testbed.compactSpanPaths)(
      'a compact span path ($form) returns no span',
      ({path}) => {
        expect(getSpan(testbed.snapshot, path)).toEqual(undefined)
      },
    )
  },
)
