import {compileSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../../test-utils/text-block-depths'
import {resolveTestbedContainers} from '../traversal/node-traversal-testbed'
import {getChildFieldName} from './get-child-field-name'

describe(`${getChildFieldName.name} with a compact path to a text block`, () => {
  const schema = compileSchema(textBlockDepthsSchemaDefinition)
  const containers = resolveTestbedContainers(schema, textBlockDepthsContainers)

  test('inside a callout, a compact block path (indexed) returns no child field', () => {
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

    expect(getChildFieldName({schema, containers, value}, [0, 0])).toEqual(
      undefined,
    )
  })

  test('inside a callout inside a callout, a compact block path (indexed) returns no child field', () => {
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

    expect(getChildFieldName({schema, containers, value}, [0, 0, 0])).toEqual(
      undefined,
    )
  })

  test('inside a field with its own sub-schema, a compact block path (indexed) returns no child field', () => {
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

    expect(getChildFieldName({schema, containers, value}, [0, 0])).toEqual(
      undefined,
    )
  })
})
