import {compileSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../../test-utils/text-block-depths'
import {resolveTestbedContainers} from '../traversal/node-traversal-testbed'
import {resolveContainerAt} from './resolve-container-at'

describe(`${resolveContainerAt.name} with a compact path to a text block`, () => {
  const schema = compileSchema(textBlockDepthsSchemaDefinition)
  const containers = resolveTestbedContainers(schema, textBlockDepthsContainers)

  test('inside a callout, a compact container path (the innermost container with an index after it) resolves nothing', () => {
    const value = [
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]

    expect(resolveContainerAt(containers, value, [{_key: 'c0'}, 0])).toEqual(
      undefined,
    )
  })

  test('inside a callout inside a callout, a compact container path (keyed) resolves nothing', () => {
    const value = [
      {
        _type: 'callout',
        _key: 'c0',
        content: [
          {
            _type: 'callout',
            _key: 'c1',
            content: [
              {
                _type: 'block',
                _key: 'b0',
                children: [
                  {_type: 'span', _key: 's0', text: 'foo', marks: []},
                  {_type: 'span', _key: 's1', text: 'bar', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ],
      },
    ]

    expect(
      resolveContainerAt(containers, value, [{_key: 'c0'}, {_key: 'c1'}]),
    ).toEqual(undefined)
  })

  test('inside a field with its own sub-schema, a compact container path (the innermost container with an index after it) resolves nothing', () => {
    const value = [
      {
        _type: 'note',
        _key: 'n0',
        body: [
          {
            _type: 'block',
            _key: 'b0',
            children: [
              {_type: 'span', _key: 's0', text: 'foo', marks: []},
              {_type: 'span', _key: 's1', text: 'bar', marks: []},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    ]

    expect(resolveContainerAt(containers, value, [{_key: 'n0'}, 0])).toEqual(
      undefined,
    )
  })
})
