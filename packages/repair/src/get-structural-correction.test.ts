import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {getStructuralCorrection} from './get-structural-correction'

const schema = compileSchema(defineSchema({}))

describe(getStructuralCorrection.name, () => {
  test.each([
    {node: undefined, name: 'undefined'},
    {node: null, name: 'null'},
    {node: 'string', name: 'a string'},
    {node: 42, name: 'a number'},
    {node: false, name: 'a boolean'},
    {node: [], name: 'an empty array'},
    {node: ['x'], name: 'a non-empty array'},
  ])('removes $name at every array depth', ({node}) => {
    const context = {schema, keyGenerator: () => 'generated'}

    expect([
      getStructuralCorrection(context, {
        node,
        path: [0],
        parent: undefined,
        siblings: () => [],
      }),
      getStructuralCorrection(context, {
        node,
        path: [{_key: 'c0'}, 'content', 0],
        parent: {
          node: {_type: 'container', _key: 'c0'},
          path: [{_key: 'c0'}],
        },
        siblings: () => [],
      }),
      getStructuralCorrection(context, {
        node,
        path: [{_key: 'b0'}, 'children', 1],
        parent: {
          node: {_type: schema.block.name, _key: 'b0', children: []},
          path: [{_key: 'b0'}],
        },
        siblings: () => [],
      }),
    ]).toEqual([
      {type: 'non-object', patches: [{type: 'unset', path: [0]}]},
      {
        type: 'non-object',
        patches: [{type: 'unset', path: [{_key: 'c0'}, 'content', 0]}],
      },
      {
        type: 'non-object',
        patches: [{type: 'unset', path: [{_key: 'b0'}, 'children', 1]}],
      },
    ])
  })

  test.each([null, 'string', [], ['x']])(
    'does not repair a non-object root',
    (node) => {
      expect(
        getStructuralCorrection(
          {schema, keyGenerator: () => 'generated'},
          {
            node,
            path: [],
            parent: undefined,
            siblings: () => [],
          },
        ),
      ).toEqual(undefined)
    },
  )

  test('adds a missing type before applying later rules', () => {
    expect(
      getStructuralCorrection(
        {schema, keyGenerator: () => 'generated'},
        {
          node: {},
          path: [0],
          parent: undefined,
          siblings: () => [{}],
        },
      ),
    ).toEqual({
      type: 'missing-type',
      patches: [{type: 'set', path: [0, '_type'], value: schema.block.name}],
    })
  })

  test.each([undefined, ''])('replaces an unusable key %s', (key) => {
    expect(
      getStructuralCorrection(
        {schema, keyGenerator: () => 'generated'},
        {
          node: {_type: schema.block.name, _key: key, children: []},
          path: [0],
          parent: undefined,
          siblings: () => [],
        },
      ),
    ).toEqual({
      type: 'missing-key',
      patches: [{type: 'set', path: [0, '_key'], value: 'generated'}],
    })
  })

  test('renames the second duplicate sibling by index', () => {
    expect(
      getStructuralCorrection(
        {schema, keyGenerator: () => 'generated'},
        {
          node: {_type: 'image', _key: 'duplicate'},
          path: [{_key: 'parent'}, 'children', {_key: 'duplicate'}],
          parent: {
            node: {_type: 'container', _key: 'parent'},
            path: [{_key: 'parent'}],
          },
          siblings: () => [
            {_key: 'duplicate'},
            {_key: 'unique'},
            {_key: 'duplicate'},
          ],
        },
      ),
    ).toEqual({
      type: 'duplicate-key',
      patches: [
        {
          type: 'set',
          path: [{_key: 'parent'}, 'children', 2, '_key'],
          value: 'generated',
        },
      ],
    })
  })

  test('skips the duplicate scan for a verified group', () => {
    const keyGenerator = vi.fn(() => 'generated')

    expect(
      getStructuralCorrection(
        {schema, keyGenerator},
        {
          node: {_type: 'image', _key: 'key'},
          path: [0],
          parent: undefined,
          siblings: () => undefined,
        },
      ),
    ).toEqual(undefined)
    expect(keyGenerator).toHaveBeenCalledTimes(0)
  })

  test('repairs keys before span text', () => {
    const context = {schema, keyGenerator: () => 'generated'}

    expect([
      getStructuralCorrection(context, {
        node: {_type: schema.span.name, _key: '', text: 42},
        path: [0],
        parent: {node: {_type: schema.block.name, children: []}, path: []},
        siblings: () => [{_key: ''}, {_key: ''}],
      }),
      getStructuralCorrection(context, {
        node: {_type: schema.span.name, _key: 'duplicate', text: 42},
        path: [0],
        parent: {node: {_type: schema.block.name, children: []}, path: []},
        siblings: () => [{_key: 'duplicate'}, {_key: 'duplicate'}],
      }),
      getStructuralCorrection(context, {
        node: {_type: schema.span.name, _key: 'unique', text: 42},
        path: [0],
        parent: {node: {_type: schema.block.name, children: []}, path: []},
        siblings: () => [{_key: 'unique'}],
      }),
    ]).toEqual([
      {
        type: 'missing-key',
        patches: [{type: 'set', path: [0, '_key'], value: 'generated'}],
      },
      {
        type: 'duplicate-key',
        patches: [{type: 'set', path: [1, '_key'], value: 'generated'}],
      },
      {
        type: 'span-text',
        patches: [{type: 'set', path: [0, 'text'], value: ''}],
      },
    ])
  })

  test('replaces non-string span text', () => {
    expect(
      getStructuralCorrection(
        {schema, keyGenerator: () => 'generated'},
        {
          node: {_type: schema.span.name, _key: 'span', text: 42},
          path: [0, 'children', {_key: 'span'}],
          parent: {node: {_type: schema.block.name, children: []}, path: []},
          siblings: () => [],
        },
      ),
    ).toEqual({
      type: 'span-text',
      patches: [
        {type: 'set', path: [0, 'children', {_key: 'span'}, 'text'], value: ''},
      ],
    })
  })

  test('adds missing text block children', () => {
    expect(
      getStructuralCorrection(
        {schema, keyGenerator: () => 'generated'},
        {
          node: {_type: schema.block.name, _key: 'block'},
          path: [{_key: 'block'}],
          parent: undefined,
          siblings: () => [],
        },
      ),
    ).toEqual({
      type: 'missing-children',
      patches: [{type: 'set', path: [{_key: 'block'}, 'children'], value: []}],
    })
  })

  test('keeps a span at block position intact', () => {
    const keyGenerator = createTestKeyGenerator()
    const spanKey = keyGenerator()
    const node = {
      _type: schema.span.name,
      _key: spanKey,
      text: 42,
      marks: [],
      custom: 'foo',
    }
    expect(
      getStructuralCorrection(
        {schema, keyGenerator},
        {node, path: [{_key: spanKey}], parent: undefined, siblings: () => []},
      ),
    ).toEqual(undefined)
    expect(node).toEqual({
      _type: 'span',
      _key: 'k0',
      text: 42,
      marks: [],
      custom: 'foo',
    })
  })

  test('keeps a text block inside a text block children intact', () => {
    const keyGenerator = createTestKeyGenerator()
    const parentKey = keyGenerator()
    const blockKey = keyGenerator()
    const node = {_type: schema.block.name, _key: blockKey, custom: 'foo'}
    expect(
      getStructuralCorrection(
        {schema, keyGenerator},
        {
          node,
          path: [{_key: parentKey}, 'children', {_key: blockKey}],
          parent: {
            node: {_type: schema.block.name, _key: parentKey, children: [node]},
            path: [{_key: parentKey}],
          },
          siblings: () => [node],
        },
      ),
    ).toEqual(undefined)
    expect(node).toEqual({_type: 'block', _key: 'k1', custom: 'foo'})
  })
})
