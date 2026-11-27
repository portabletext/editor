import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../../test-utils/text-block-depths'
import {getNode} from './get-node'
import {getSpan} from './get-span'
import {getTextBlock} from './get-text-block'
import {getBlock, isBlock} from './is-block'
import {isInline} from './is-inline'
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

describe(isBlock.name, () => {
  test('classifies each occurrence by position and hides object payloads', () => {
    const keyGenerator = createTestKeyGenerator()
    const span = {_type: 'span', _key: keyGenerator(), text: 'foo', marks: []}
    const nested = {
      _type: 'block',
      _key: keyGenerator(),
      children: [span],
      markDefs: [],
      style: 'normal',
    }
    const snapshot = createTestSnapshot({
      context: {
        value: [
          span,
          nested,
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [nested],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    })

    expect(getBlock(snapshot, [0])).toEqual({
      node: span,
      path: [{_key: span._key}],
    })
    expect(getSpan(snapshot, [0])).toEqual(undefined)
    expect(isBlock(snapshot, [1])).toEqual(true)
    expect(isBlock(snapshot, [1, 'style'])).toEqual(true)
    expect(isInline(snapshot, [1, 'children', 0])).toEqual(true)
    expect(isInline(snapshot, [2, 'children', 0])).toEqual(true)
    expect(getTextBlock(snapshot, [2, 'children', 0])).toEqual(undefined)
    expect(getSpan(snapshot, [2, 'children', 0])).toEqual(undefined)
    expect(getNode(snapshot, [2, 'children', 0, 'children', 0])).toEqual(
      undefined,
    )
    expect(getNode(snapshot, [2, 'markDefs', 0])).toEqual(undefined)
    expect(getNode(snapshot, [])).toEqual(undefined)
  })

  test('classifies malformed text payloads by position', () => {
    const keyGenerator = createTestKeyGenerator()
    const snapshot = createTestSnapshot({
      context: {
        value: [
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [
              {
                _type: 'block',
                _key: keyGenerator(),
                children: [42],
                markDefs: [42],
              },
              {_type: 'span', _key: keyGenerator(), text: 42},
            ],
            markDefs: [],
            style: 'normal',
          },
        ],
      },
    })

    expect(isBlock(snapshot, [0])).toEqual(true)
    expect(isInline(snapshot, [0, 'children', 0])).toEqual(true)
    expect(getTextBlock(snapshot, [0, 'children', 0])).toEqual(undefined)
    expect(getSpan(snapshot, [0, 'children', 0])).toEqual(undefined)
    expect(isInline(snapshot, [0, 'children', 1])).toEqual(true)
    expect(getNode(snapshot, [0, 'children', 0, 'children', 0])).toEqual(
      undefined,
    )
    expect(getNode(snapshot, [0, 'children', 0, 'markDefs', 0])).toEqual(
      undefined,
    )
  })
})

describe(`${isBlock.name} at a path that names no node`, () => {
  test('a missing top-level node is not a block', () => {
    const keyGenerator = createTestKeyGenerator()
    const snapshot = createTestSnapshot({
      context: {
        value: [
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [{_type: 'span', _key: keyGenerator(), text: 'foo'}],
          },
        ],
      },
    })

    expect(isBlock(snapshot, [{_key: 'missing'}])).toEqual(false)
  })

  test('a missing node in a callout is not a block', () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const snapshot = createTestSnapshot({
      context: {
        schema: depthsSchema,
        containers: depthsContainers,
        value: [{_type: 'callout', _key: calloutKey, content: []}],
      },
    })

    expect(
      isBlock(snapshot, [{_key: calloutKey}, 'content', {_key: 'missing'}]),
    ).toEqual(false)
  })

  test('the empty path is not a block', () => {
    const keyGenerator = createTestKeyGenerator()
    const snapshot = createTestSnapshot({
      context: {
        value: [
          {
            _type: 'block',
            _key: keyGenerator(),
            children: [{_type: 'span', _key: keyGenerator(), text: 'foo'}],
          },
        ],
      },
    })

    expect(isBlock(snapshot, [])).toEqual(false)
  })

  test('an index into a block object field is not a block', () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const snapshot = createTestSnapshot({
      context: {
        schema: compileSchema(defineSchema({blockObjects: [{name: 'image'}]})),
        value: [{_type: 'image', _key: imageKey, caption: ['foo']}],
      },
    })

    expect(isBlock(snapshot, [{_key: imageKey}, 'caption', 0])).toEqual(false)
  })

  test('a missing key in a block object field is not a block', () => {
    const keyGenerator = createTestKeyGenerator()
    const imageKey = keyGenerator()
    const snapshot = createTestSnapshot({
      context: {
        schema: compileSchema(defineSchema({blockObjects: [{name: 'image'}]})),
        value: [{_type: 'image', _key: imageKey, markDefs: []}],
      },
    })

    expect(
      isBlock(snapshot, [{_key: imageKey}, 'markDefs', {_key: 'missing'}]),
    ).toEqual(false)
  })
})
