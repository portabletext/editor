import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import type {TraversalContainers} from '../schema/resolve-containers'
import {defaultKeyGenerator} from '../utils/key-generator'
import {buildIndexMaps} from './build-index-maps'

function blockObject(_key: string, name: string) {
  return {
    _key,
    _type: name,
  }
}

function textBlock(
  _key: string,
  {
    listItem,
    level,
  }: {
    listItem?: 'bullet' | 'number'
    level?: number
  },
): PortableTextBlock {
  return {
    _key,
    _type: 'block',
    children: [
      {
        _key: defaultKeyGenerator(),
        _type: 'span',
        text: `${listItem}-${level}`,
      },
    ],
    style: 'normal',
    level,
    listItem,
  }
}

const schema = compileSchema(
  defineSchema({
    blockObjects: [{name: 'image'}],
  }),
)

function calloutContainers(): TraversalContainers {
  return new Map([
    [
      'callout',
      {
        field: {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}],
        },
      },
    ],
  ])
}

describe(buildIndexMaps.name, () => {
  const blockIndexMap = new Map<string, number>()
  const listIndexMap = new Map<string, number>()

  test('empty', () => {
    buildIndexMaps(
      {schema, containers: new Map(), value: []},
      {blockIndexMap, listIndexMap},
    )
    expect(blockIndexMap).toEqual(new Map())
    expect(listIndexMap).toEqual(new Map())
  })

  /**
   * #
   */
  test('single list item', () => {
    buildIndexMaps(
      {
        schema,
        containers: new Map(),
        value: [textBlock('k0', {listItem: 'number', level: 1})],
      },
      {blockIndexMap, listIndexMap},
    )
    expect(blockIndexMap).toEqual(new Map([['k0', 0]]))
    expect(listIndexMap).toEqual(new Map([['k0', 1]]))
  })

  /**
   *   #
   */
  test('single indented list item', () => {
    buildIndexMaps(
      {
        schema,
        containers: new Map(),
        value: [textBlock('k0', {listItem: 'number', level: 2})],
      },
      {blockIndexMap, listIndexMap},
    )
    expect(blockIndexMap).toEqual(new Map([['k0', 0]]))
    expect(listIndexMap).toEqual(new Map([['k0', 1]]))
  })

  /**
   * #
   * #
   *
   * #
   * #
   */
  test('two lists broken up by a paragraph', () => {
    buildIndexMaps(
      {
        schema,
        containers: new Map(),

        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          textBlock('k1', {listItem: 'number', level: 1}),
          textBlock('k2', {}),
          textBlock('k3', {listItem: 'number', level: 1}),
          textBlock('k4', {listItem: 'number', level: 1}),
        ],
      },
      {blockIndexMap, listIndexMap},
    )
    expect(blockIndexMap).toEqual(
      new Map([
        ['k0', 0],
        ['k1', 1],
        ['k2', 2],
        ['k3', 3],
        ['k4', 4],
      ]),
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['k0', 1],
        ['k1', 2],
        ['k3', 1],
        ['k4', 2],
      ]),
    )
  })

  /**
   * #
   * #
   * {image}
   * #
   * #
   */
  test('two lists broken up by an image', () => {
    buildIndexMaps(
      {
        schema,
        containers: new Map(),

        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          textBlock('k1', {listItem: 'number', level: 1}),
          blockObject('k2', 'image'),
          textBlock('k3', {listItem: 'number', level: 1}),
          textBlock('k4', {listItem: 'number', level: 1}),
        ],
      },
      {blockIndexMap, listIndexMap},
    )
    expect(blockIndexMap).toEqual(
      new Map([
        ['k0', 0],
        ['k1', 1],
        ['k2', 2],
        ['k3', 3],
        ['k4', 4],
      ]),
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['k0', 1],
        ['k1', 2],
        ['k3', 1],
        ['k4', 2],
      ]),
    )
  })

  /**
   * #
   * -
   * #
   */
  test('numbered lists broken up by a bulleted list', () => {
    buildIndexMaps(
      {
        schema,
        containers: new Map(),

        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          textBlock('k1', {listItem: 'bullet', level: 1}),
          textBlock('k2', {listItem: 'number', level: 1}),
        ],
      },
      {blockIndexMap, listIndexMap},
    )
    expect(blockIndexMap).toEqual(
      new Map([
        ['k0', 0],
        ['k1', 1],
        ['k2', 2],
      ]),
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['k0', 1],
        ['k1', 1],
        ['k2', 1],
      ]),
    )
  })

  /**
   * #
   *   -
   * #
   */
  test('numbered list broken up by an indented bulleted list', () => {
    buildIndexMaps(
      {
        schema,
        containers: new Map(),

        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          textBlock('k1', {listItem: 'bullet', level: 2}),
          textBlock('k2', {listItem: 'number', level: 1}),
        ],
      },
      {blockIndexMap, listIndexMap},
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['k0', 1],
        ['k1', 1],
        ['k2', 2],
      ]),
    )
  })

  /**
   * #
   * #
   * -
   *   -
   * #
   */
  test('numbered list broken up by a nested bulleted list', () => {
    buildIndexMaps(
      {
        schema,
        containers: new Map(),

        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          textBlock('k1', {listItem: 'number', level: 1}),
          textBlock('k2', {listItem: 'bullet', level: 1}),
          textBlock('k3', {listItem: 'bullet', level: 2}),
          textBlock('k4', {listItem: 'number', level: 1}),
        ],
      },
      {blockIndexMap, listIndexMap},
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['k0', 1],
        ['k1', 2],
        ['k2', 1],
        ['k3', 1],
        ['k4', 1],
      ]),
    )
  })

  /**
   * #
   * #
   *   -
   * -
   *   -
   * #
   */
  test('numbered list broken up by an inverse-indented bulleted list', () => {
    buildIndexMaps(
      {
        schema,
        containers: new Map(),

        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          textBlock('k1', {listItem: 'number', level: 1}),
          textBlock('k2', {listItem: 'bullet', level: 2}),
          textBlock('k3', {listItem: 'bullet', level: 1}),
          textBlock('k4', {listItem: 'bullet', level: 2}),
          textBlock('k5', {listItem: 'number', level: 1}),
        ],
      },
      {blockIndexMap, listIndexMap},
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['k0', 1],
        ['k1', 2],
        ['k2', 1],
        ['k3', 1],
        ['k4', 1],
        ['k5', 1],
      ]),
    )
  })

  /**
   * #
   *   #
   *   #
   * #
   */
  test('simple indented list', () => {
    buildIndexMaps(
      {
        schema,
        containers: new Map(),

        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          textBlock('k1', {listItem: 'number', level: 2}),
          textBlock('k2', {listItem: 'number', level: 2}),
          textBlock('k3', {listItem: 'number', level: 1}),
        ],
      },
      {blockIndexMap, listIndexMap},
    )
    expect(blockIndexMap).toEqual(
      new Map([
        ['k0', 0],
        ['k1', 1],
        ['k2', 2],
        ['k3', 3],
      ]),
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['k0', 1],
        ['k1', 1],
        ['k2', 2],
        ['k3', 2],
      ]),
    )
  })

  /**
   *   #
   * #
   *   #
   */
  test('reverse indented list', () => {
    buildIndexMaps(
      {
        schema,
        containers: new Map(),

        value: [
          textBlock('k0', {listItem: 'number', level: 2}),
          textBlock('k1', {listItem: 'number', level: 1}),
          textBlock('k2', {listItem: 'number', level: 2}),
        ],
      },
      {blockIndexMap, listIndexMap},
    )
    expect(blockIndexMap).toEqual(
      new Map([
        ['k0', 0],
        ['k1', 1],
        ['k2', 2],
      ]),
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['k0', 1],
        ['k1', 1],
        ['k2', 1],
      ]),
    )
  })

  /**
   * #
   *     #
   *   #
   *     #
   * #
   *     #
   *       #
   *     #
   * #
   */
  test('complex list', () => {
    buildIndexMaps(
      {
        schema,
        containers: new Map(),

        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          textBlock('k1', {listItem: 'number', level: 3}),
          textBlock('k2', {listItem: 'number', level: 2}),
          textBlock('k3', {listItem: 'number', level: 3}),
          textBlock('k4', {listItem: 'number', level: 1}),
          textBlock('k5', {listItem: 'number', level: 3}),
          textBlock('k6', {listItem: 'number', level: 4}),
          textBlock('k7', {listItem: 'number', level: 3}),
          textBlock('k8', {listItem: 'number', level: 1}),
        ],
      },
      {blockIndexMap, listIndexMap},
    )
    expect(blockIndexMap).toEqual(
      new Map([
        ['k0', 0],
        ['k1', 1],
        ['k2', 2],
        ['k3', 3],
        ['k4', 4],
        ['k5', 5],
        ['k6', 6],
        ['k7', 7],
        ['k8', 8],
      ]),
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['k0', 1],
        ['k1', 1],
        ['k2', 1],
        ['k3', 1],
        ['k4', 2],
        ['k5', 1],
        ['k6', 1],
        ['k7', 2],
        ['k8', 3],
      ]),
    )
  })

  /**
   * -
   *   #
   *   #
   */
  test('bulleted list with indented numbered list', () => {
    buildIndexMaps(
      {
        schema,
        containers: new Map(),

        value: [
          textBlock('k0', {listItem: 'bullet', level: 1}),
          textBlock('k1', {listItem: 'number', level: 2}),
          textBlock('k2', {listItem: 'number', level: 2}),
        ],
      },
      {blockIndexMap, listIndexMap},
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['k0', 1],
        ['k1', 1],
        ['k2', 2],
      ]),
    )
  })

  /**
   *   #
   * -
   *   #
   */
  test('indented numbered list broken up by outdented bulleted list', () => {
    buildIndexMaps(
      {
        schema,
        containers: new Map(),

        value: [
          textBlock('k0', {listItem: 'number', level: 2}),
          textBlock('k1', {listItem: 'bullet', level: 1}),
          textBlock('k3', {listItem: 'number', level: 2}),
        ],
      },
      {blockIndexMap, listIndexMap},
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['k0', 1],
        ['k1', 1],
        ['k3', 1],
      ]),
    )
  })

  /**
   * Callout container wraps a single numbered list of two items. Root has an
   * earlier list that should not interfere with the container's list run.
   *
   * # (root)
   * [callout:
   *   # (inside)
   *   # (inside)
   * ]
   */
  test('list inside an editable container starts its own counter', () => {
    buildIndexMaps(
      {
        schema,
        containers: calloutContainers(),
        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          {
            _key: 'c0',
            _type: 'callout',
            content: [
              textBlock('c1', {listItem: 'number', level: 1}),
              textBlock('c2', {listItem: 'number', level: 1}),
            ],
          },
        ],
      },
      {blockIndexMap, listIndexMap},
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['k0', 1],
        ['c1', 1],
        ['c2', 2],
      ]),
    )
  })

  /**
   * Two back-to-back callouts. Each container is its own counter scope;
   * the second callout's list starts at 1.
   *
   * [callout:
   *   #
   *   #
   * ]
   * [callout:
   *   #
   * ]
   */
  test('two sibling containers each have their own list scope', () => {
    buildIndexMaps(
      {
        schema,
        containers: calloutContainers(),
        value: [
          {
            _key: 'a',
            _type: 'callout',
            content: [
              textBlock('a0', {listItem: 'number', level: 1}),
              textBlock('a1', {listItem: 'number', level: 1}),
            ],
          },
          {
            _key: 'b',
            _type: 'callout',
            content: [textBlock('b0', {listItem: 'number', level: 1})],
          },
        ],
      },
      {blockIndexMap, listIndexMap},
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['a0', 1],
        ['a1', 2],
        ['b0', 1],
      ]),
    )
  })
})
