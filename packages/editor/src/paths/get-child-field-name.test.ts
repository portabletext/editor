import {describe, expect, test} from 'vitest'
import {
  createTextBlockDepthTestbed,
  textBlockDepths,
} from '../traversal/node-traversal-testbed'
import {getChildFieldName} from './get-child-field-name'

describe.each(textBlockDepths)(
  `${getChildFieldName.name} with a compact path to a text block %s`,
  (depth) => {
    const testbed = createTextBlockDepthTestbed(depth)
    const {context} = testbed.snapshot

    test('the full block path returns its child field', () => {
      expect(getChildFieldName(context, testbed.blockPath)).toEqual('children')
    })

    test.each(testbed.compactBlockPaths)(
      'a compact block path ($form) returns no child field',
      ({path}) => {
        expect(getChildFieldName(context, path)).toEqual(undefined)
      },
    )
  },
)
