import {describe, expect, test} from 'vitest'
import {
  createTextBlockDepthTestbed,
  textBlockDepths,
} from '../traversal/node-traversal-testbed'
import {resolveContainerAt} from './resolve-container-at'

describe.each(textBlockDepths)(
  `${resolveContainerAt.name} with a compact path to a text block %s`,
  (depth) => {
    const testbed = createTextBlockDepthTestbed(depth)
    const {containers, value} = testbed.snapshot.context

    test('the full path to each container ancestor resolves its registration', () => {
      expect(
        testbed.containerAncestors.map((ancestor) =>
          resolveContainerAt(containers, value, ancestor.path),
        ),
      ).toEqual(
        testbed.containerAncestors.map((ancestor) =>
          containers.get(ancestor.node._type),
        ),
      )
    })

    test.each(testbed.compactContainerPaths)(
      'a compact container path ($form) resolves nothing',
      ({path}) => {
        expect(resolveContainerAt(containers, value, path)).toEqual(undefined)
      },
    )

    test.each(testbed.compactBlockPaths)(
      'a compact block path ($form) resolves nothing',
      ({path}) => {
        expect(resolveContainerAt(containers, value, path)).toEqual(undefined)
      },
    )
  },
)
