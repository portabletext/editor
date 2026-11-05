import {describe, expect, test} from 'vitest'
import {
  createTextBlockDepthTestbed,
  textBlockDepths,
} from '../traversal/node-traversal-testbed'
import {resolveContainerByPath} from './resolve-container-by-path'
import {resolveContainersRich} from './resolve-containers'

describe.each(textBlockDepths)(
  `${resolveContainerByPath.name} with a compact path to a text block %s`,
  (depth) => {
    const testbed = createTextBlockDepthTestbed(depth)
    const {schema, value} = testbed.snapshot.context
    const input = {
      schema,
      value,
      containers: resolveContainersRich(schema, testbed.publicContainers),
    }

    test('the full path to each container ancestor resolves its container', () => {
      expect(
        testbed.containerAncestors.map((ancestor) =>
          resolveContainerByPath(input, ancestor.path, ancestor.node),
        ),
      ).toEqual(
        testbed.containerAncestors.map((ancestor) =>
          input.containers.get(ancestor.node._type),
        ),
      )
    })

    test.each(testbed.compactContainerPaths)(
      'a compact container path ($form) resolves nothing',
      ({path}) => {
        const innermostContainer = testbed.containerAncestors.at(0)!

        expect(
          resolveContainerByPath(input, path, innermostContainer.node),
        ).toEqual(undefined)
      },
    )
  },
)
