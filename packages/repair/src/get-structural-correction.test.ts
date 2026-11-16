import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test, vi} from 'vitest'
import {getStructuralCorrection} from './get-structural-correction'

const schema = compileSchema(defineSchema({}))

describe(getStructuralCorrection.name, () => {
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
        parent: undefined,
        siblings: () => [{_key: ''}, {_key: ''}],
      }),
      getStructuralCorrection(context, {
        node: {_type: schema.span.name, _key: 'duplicate', text: 42},
        path: [0],
        parent: undefined,
        siblings: () => [{_key: 'duplicate'}, {_key: 'duplicate'}],
      }),
      getStructuralCorrection(context, {
        node: {_type: schema.span.name, _key: 'unique', text: 42},
        path: [0],
        parent: undefined,
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
          parent: undefined,
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
})
