import {compileSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../../test-utils/text-block-depths'
import {getBlock, isBlock} from './is-block'
import {resolveTestbedContainers} from './node-traversal-testbed'

const depthsSchema = compileSchema(textBlockDepthsSchemaDefinition)
const depthsContainers = resolveTestbedContainers(
  depthsSchema,
  textBlockDepthsContainers,
)

describe(`${isBlock.name} with a compact path to a text block at the root`, () => {
  test('a compact span path (missing key then indexed) is not a block', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [
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
    })

    expect(isBlock(snapshot, [{_key: 'b0-missing'}, 0])).toEqual(false)
  })
})

describe(`${isBlock.name} with a compact path to a text block inside a callout`, () => {
  test('a compact span path (missing key then indexed) is not a block', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [
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
        ],
      },
    })

    expect(
      isBlock(snapshot, [{_key: 'c0'}, 'content', {_key: 'b0-missing'}, 0]),
    ).toEqual(false)
  })
})

describe(`${isBlock.name} with a compact path to a text block inside a callout inside a callout`, () => {
  test('a compact span path (missing key then indexed) is not a block', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [
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
        ],
      },
    })

    expect(
      isBlock(snapshot, [
        {_key: 'c0'},
        'content',
        {_key: 'c1'},
        'content',
        {_key: 'b0-missing'},
        0,
      ]),
    ).toEqual(false)
  })
})

describe(`${isBlock.name} with a compact path to a text block inside a field with its own sub-schema`, () => {
  test('a compact span path (missing key then indexed) is not a block', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [
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
        ],
      },
    })

    expect(
      isBlock(snapshot, [{_key: 'n0'}, 'body', {_key: 'b0-missing'}, 0]),
    ).toEqual(false)
  })
})

describe(`${getBlock.name} with a compact path to a text block inside a callout`, () => {
  test('a compact block path (indexed) returns no block', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [
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
        ],
      },
    })

    expect(getBlock(snapshot, [0, 0])).toEqual(undefined)
  })
})

describe(`${getBlock.name} with a compact path to a text block inside a callout inside a callout`, () => {
  test('a compact block path (indexed) returns no block', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [
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
        ],
      },
    })

    expect(getBlock(snapshot, [0, 0, 0])).toEqual(undefined)
  })
})

describe(`${getBlock.name} with a compact path to a text block inside a field with its own sub-schema`, () => {
  test('a compact block path (indexed) returns no block', () => {
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [
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
        ],
      },
    })

    expect(getBlock(snapshot, [0, 0])).toEqual(undefined)
  })
})
