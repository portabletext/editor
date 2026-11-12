import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {createTestSnapshot} from '../../test-utils/create-test-snapshot'
import {
  textBlockDepthsContainers,
  textBlockDepthsSchemaDefinition,
} from '../../test-utils/text-block-depths'
import {
  createNodeTraversalTestbed,
  resolveTestbedContainers,
} from '../traversal/node-traversal-testbed'
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
        snapshot: createTestSnapshot({
          context: {
            schema,
            containers: new Map(),
            value: [
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
        }),
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
        snapshot: createTestSnapshot({
          context: {
            schema,
            containers: new Map(),
            value: [
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
        }),
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
        snapshot: createTestSnapshot({
          context: {
            schema,
            containers: new Map(),
            value: [
              {
                _key: blockObjectKey,
                _type: 'image',
              },
            ],
          },
        }),
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
        snapshot: createTestSnapshot({
          context: {
            schema,
            containers: new Map(),
            value: [
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
        }),
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

    expect(range).toEqual(null)
  })

  test("Scenario: Span offset that doesn't exist", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()

    const range = resolveSelection(
      {
        snapshot: createTestSnapshot({
          context: {
            schema,
            containers: new Map(),
            value: [
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
        }),
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
        snapshot: createTestSnapshot({
          context: {
            schema,
            containers: new Map(),
            value: [
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
        }),
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
        snapshot: createTestSnapshot({
          context: {
            schema: context.schema,
            containers: context.containers,
            value: context.value,
          },
        }),
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
        snapshot: createTestSnapshot({
          context: {
            schema: context.schema,
            containers: context.containers,
            value: context.value,
          },
        }),
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

const depthsSchema = compileSchema(textBlockDepthsSchemaDefinition)
const depthsContainers = resolveTestbedContainers(
  depthsSchema,
  textBlockDepthsContainers,
)

describe(`${resolveSelection.name} with a compact path to a text block at the root`, () => {
  test('a range with a valid anchor and a focus at a compact span path (indexed) resolves to nothing', () => {
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

    expect(
      resolveSelection(
        {snapshot},
        {
          anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 1},
          focus: {path: [0, 0], offset: 2},
        },
      ),
    ).toEqual(null)
  })

  test('a range with an anchor at a compact span path (indexed) and a valid focus resolves to nothing', () => {
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

    expect(
      resolveSelection(
        {snapshot},
        {
          anchor: {path: [0, 0], offset: 1},
          focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 2},
        },
      ),
    ).toEqual(null)
  })

  test('a point at a compact span path (indexed) resolves to nothing', () => {
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

    expect(
      resolveSelection(
        {snapshot},
        {anchor: {path: [0, 0], offset: 1}, focus: {path: [0, 0], offset: 1}},
      ),
    ).toEqual(null)
  })
})

describe(`${resolveSelection.name} with a compact path to a text block inside a callout`, () => {
  test('a range with a valid anchor and a focus at a compact span path (indexed) resolves to nothing', () => {
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
      resolveSelection(
        {snapshot},
        {
          anchor: {
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b0'},
              'children',
              {_key: 's0'},
            ],
            offset: 1,
          },
          focus: {path: [0, 'content', 0, 0], offset: 2},
        },
      ),
    ).toEqual(null)
  })

  test('a range with an anchor at a compact span path (indexed) and a valid focus resolves to nothing', () => {
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
      resolveSelection(
        {snapshot},
        {
          anchor: {path: [0, 'content', 0, 0], offset: 1},
          focus: {
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'b0'},
              'children',
              {_key: 's0'},
            ],
            offset: 2,
          },
        },
      ),
    ).toEqual(null)
  })

  test('a point at a compact span path (indexed) resolves to nothing', () => {
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
      resolveSelection(
        {snapshot},
        {
          anchor: {path: [0, 'content', 0, 0], offset: 1},
          focus: {path: [0, 'content', 0, 0], offset: 1},
        },
      ),
    ).toEqual(null)
  })
})

describe(`${resolveSelection.name} with a compact path to a text block inside a callout inside a callout`, () => {
  test('a range with a valid anchor and a focus at a compact span path (indexed) resolves to nothing', () => {
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
      resolveSelection(
        {snapshot},
        {
          anchor: {
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b0'},
              'children',
              {_key: 's0'},
            ],
            offset: 1,
          },
          focus: {path: [0, 'content', 0, 'content', 0, 0], offset: 2},
        },
      ),
    ).toEqual(null)
  })

  test('a range with an anchor at a compact span path (indexed) and a valid focus resolves to nothing', () => {
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
      resolveSelection(
        {snapshot},
        {
          anchor: {path: [0, 'content', 0, 'content', 0, 0], offset: 1},
          focus: {
            path: [
              {_key: 'c0'},
              'content',
              {_key: 'c1'},
              'content',
              {_key: 'b0'},
              'children',
              {_key: 's0'},
            ],
            offset: 2,
          },
        },
      ),
    ).toEqual(null)
  })

  test('a point at a compact span path (indexed) resolves to nothing', () => {
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
      resolveSelection(
        {snapshot},
        {
          anchor: {path: [0, 'content', 0, 'content', 0, 0], offset: 1},
          focus: {path: [0, 'content', 0, 'content', 0, 0], offset: 1},
        },
      ),
    ).toEqual(null)
  })
})

describe(`${resolveSelection.name} with a compact path to a text block inside a field with its own sub-schema`, () => {
  test('a range with a valid anchor and a focus at a compact span path (indexed) resolves to nothing', () => {
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
      resolveSelection(
        {snapshot},
        {
          anchor: {
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b0'},
              'children',
              {_key: 's0'},
            ],
            offset: 1,
          },
          focus: {path: [0, 'body', 0, 0], offset: 2},
        },
      ),
    ).toEqual(null)
  })

  test('a range with an anchor at a compact span path (indexed) and a valid focus resolves to nothing', () => {
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
      resolveSelection(
        {snapshot},
        {
          anchor: {path: [0, 'body', 0, 0], offset: 1},
          focus: {
            path: [
              {_key: 'n0'},
              'body',
              {_key: 'b0'},
              'children',
              {_key: 's0'},
            ],
            offset: 2,
          },
        },
      ),
    ).toEqual(null)
  })

  test('a point at a compact span path (indexed) resolves to nothing', () => {
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
      resolveSelection(
        {snapshot},
        {
          anchor: {path: [0, 'body', 0, 0], offset: 1},
          focus: {path: [0, 'body', 0, 0], offset: 1},
        },
      ),
    ).toEqual(null)
  })
})
