import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createNodeTraversalTestbed} from '../node-traversal/node-traversal-testbed'
import {resolveSelection} from './apply-selection'

describe(resolveSelection.name, () => {
  const schema = compileSchema(
    defineSchema({
      blockObjects: [{name: 'image'}],
      inlineObjects: [
        {name: 'stock-ticker', fields: [{name: 'symbol', type: 'string'}]},
      ],
    }),
  )

  test('Scenario: Ambiguous offset inside text block', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    const range = resolveSelection(
      {
        schema,
        containers: new Map(),
        children: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: keyGenerator(),
                _type: 'span',
                text: 'foo',
              },
              {
                _key: keyGenerator(),
                _type: 'stock-ticker',
              },
              {
                _key: keyGenerator(),
                _type: 'span',
                text: 'bar',
              },
            ],
          },
        ],
      },
      {
        anchor: {
          path: [{_key: blockKey}],
          // Could point to either before or after the inline object
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}],
          // Could point to either before or after the inline object
          offset: 3,
        },
      },
    )

    expect(range).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
    })
  })

  test('Scenario: Offset right before inline object', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()

    const range = resolveSelection(
      {
        schema,
        containers: new Map(),
        children: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: keyGenerator(),
                _type: 'span',
                text: "'",
              },
              {
                _key: keyGenerator(),
                _type: 'stock-ticker',
              },
              {
                _key: keyGenerator(),
                _type: 'span',
                text: "foo'",
              },
            ],
          },
        ],
      },
      {
        anchor: {
          path: [{_key: blockKey}],
          offset: 0,
        },
        focus: {
          path: [{_key: blockKey}],
          offset: 1,
        },
      },
    )

    expect(range).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 1},
    })
  })

  test("Scenario: Block object offset that doesn't exist", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockObjectKey = keyGenerator()

    const range = resolveSelection(
      {
        schema,
        containers: new Map(),
        children: [
          {
            _key: blockObjectKey,
            _type: 'image',
          },
        ],
      },
      {
        anchor: {
          path: [{_key: blockObjectKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockObjectKey}],
          offset: 3,
        },
      },
    )

    expect(range).toEqual({
      anchor: {path: [{_key: 'k0'}], offset: 0},
      focus: {path: [{_key: 'k0'}], offset: 0},
    })
  })

  test("Scenario: Child that doesn't exist", () => {
    const keyGenerator = createTestKeyGenerator()

    const blockKey = keyGenerator()
    const removedChildKey = keyGenerator()

    const range = resolveSelection(
      {
        schema,
        containers: new Map(),
        children: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: keyGenerator(),
                _type: 'span',
                text: 'foobar',
              },
            ],
          },
        ],
      },
      {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: removedChildKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: removedChildKey}],
          offset: 3,
        },
      },
    )

    expect(range).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k2'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k2'}], offset: 0},
    })
  })

  test("Scenario: Span offset that doesn't exist", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const range = resolveSelection(
      {
        schema,
        containers: new Map(),
        children: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {
                _key: spanKey,
                _type: 'span',
                text: 'foo',
              },
            ],
          },
        ],
      },
      {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: spanKey}],
          offset: 4,
        },
      },
    )

    expect(range).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 3},
    })
  })

  test("Scenario: Inline object offset that doesn't exist", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const inlineObjectKey = keyGenerator()

    const range = resolveSelection(
      {
        schema,
        containers: new Map(),
        children: [
          {
            _key: blockKey,
            _type: 'block',
            children: [
              {_key: keyGenerator(), _type: 'span', text: 'foo'},
              {
                _key: inlineObjectKey,
                _type: 'stock-ticker',
                symbol: 'AAPL',
              },
              {
                _key: keyGenerator(),
                _type: 'span',
                text: 'bar',
              },
            ],
          },
        ],
      },
      {
        anchor: {
          path: [{_key: blockKey}, 'children', {_key: inlineObjectKey}],
          offset: 3,
        },
        focus: {
          path: [{_key: blockKey}, 'children', {_key: inlineObjectKey}],
          offset: 3,
        },
      },
    )

    expect(range).toEqual({
      anchor: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
      focus: {path: [{_key: 'k0'}, 'children', {_key: 'k1'}], offset: 0},
    })
  })

  test('Scenario: Block-level offset inside an editable container', () => {
    const {context, codeBlock, codeLine1, codeSpan1} =
      createNodeTraversalTestbed()

    const range = resolveSelection(
      {
        schema: context.schema,
        containers: context.containers,
        children: context.value,
      },
      {
        anchor: {
          path: [{_key: codeBlock._key}, 'code', {_key: codeLine1._key}],
          offset: 0,
        },
        focus: {
          path: [{_key: codeBlock._key}, 'code', {_key: codeLine1._key}],
          offset: 2,
        },
      },
    )

    expect(range).toEqual({
      anchor: {
        path: [
          {_key: codeBlock._key},
          'code',
          {_key: codeLine1._key},
          'children',
          {_key: codeSpan1._key},
        ],
        offset: 0,
      },
      focus: {
        path: [
          {_key: codeBlock._key},
          'code',
          {_key: codeLine1._key},
          'children',
          {_key: codeSpan1._key},
        ],
        offset: 2,
      },
    })
  })

  test('Scenario: Collapsed block-level offset inside an editable container', () => {
    const {context, codeBlock, codeLine1, codeSpan1} =
      createNodeTraversalTestbed()

    const range = resolveSelection(
      {
        schema: context.schema,
        containers: context.containers,
        children: context.value,
      },
      {
        anchor: {
          path: [{_key: codeBlock._key}, 'code', {_key: codeLine1._key}],
          offset: 3,
        },
        focus: {
          path: [{_key: codeBlock._key}, 'code', {_key: codeLine1._key}],
          offset: 3,
        },
      },
    )

    expect(range).toEqual({
      anchor: {
        path: [
          {_key: codeBlock._key},
          'code',
          {_key: codeLine1._key},
          'children',
          {_key: codeSpan1._key},
        ],
        offset: 3,
      },
      focus: {
        path: [
          {_key: codeBlock._key},
          'code',
          {_key: codeLine1._key},
          'children',
          {_key: codeSpan1._key},
        ],
        offset: 3,
      },
    })
  })
})
