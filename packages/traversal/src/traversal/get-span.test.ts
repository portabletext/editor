import {compileSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../../test-utils/text-block-depths'
import {getSpan} from './get-span'
import {resolveTestbedContainers} from './node-traversal-testbed'

describe(`${getSpan.name} with a compact path to a text block`, () => {
  const schema = compileSchema(textBlockDepthsSchemaDefinition)
  const containers = resolveTestbedContainers(schema, textBlockDepthsContainers)

  test('at the root, a compact span path (indexed) returns no span', () => {
    const value = [
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
    ]
    const snapshot = createTestSnapshot({context: {schema, containers, value}})

    expect(getSpan(snapshot, [0, 0])).toEqual(undefined)
  })

  test('inside a callout, a compact span path (indexed) returns no span', () => {
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
    const snapshot = createTestSnapshot({context: {schema, containers, value}})

    expect(getSpan(snapshot, [0, 'content', 0, 0])).toEqual(undefined)
  })

  test('inside a callout inside a callout, a compact span path (indexed) returns no span', () => {
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
    const snapshot = createTestSnapshot({context: {schema, containers, value}})

    expect(getSpan(snapshot, [0, 'content', 0, 'content', 0, 0])).toEqual(
      undefined,
    )
  })

  test('inside a field with its own sub-schema, a compact span path (indexed) returns no span', () => {
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
    const snapshot = createTestSnapshot({context: {schema, containers, value}})

    expect(getSpan(snapshot, [0, 'body', 0, 0])).toEqual(undefined)
  })
})
