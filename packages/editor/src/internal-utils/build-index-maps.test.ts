import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
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
        _key: `${_key}-s0`,
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
    expect(blockIndexMap).toEqual(
      new Map([
        ['[_key=="k0"]', 0],
        ['[_key=="k0"].children[_key=="k0-s0"]', 0],
      ]),
    )
    expect(listIndexMap).toEqual(new Map([['[_key=="k0"]', 1]]))
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
    expect(blockIndexMap).toEqual(
      new Map([
        ['[_key=="k0"]', 0],
        ['[_key=="k0"].children[_key=="k0-s0"]', 0],
      ]),
    )
    expect(listIndexMap).toEqual(new Map([['[_key=="k0"]', 1]]))
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
        ['[_key=="k0"]', 0],
        ['[_key=="k0"].children[_key=="k0-s0"]', 0],
        ['[_key=="k1"]', 1],
        ['[_key=="k1"].children[_key=="k1-s0"]', 0],
        ['[_key=="k2"]', 2],
        ['[_key=="k2"].children[_key=="k2-s0"]', 0],
        ['[_key=="k3"]', 3],
        ['[_key=="k3"].children[_key=="k3-s0"]', 0],
        ['[_key=="k4"]', 4],
        ['[_key=="k4"].children[_key=="k4-s0"]', 0],
      ]),
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['[_key=="k0"]', 1],
        ['[_key=="k1"]', 2],
        ['[_key=="k3"]', 1],
        ['[_key=="k4"]', 2],
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
        ['[_key=="k0"]', 0],
        ['[_key=="k0"].children[_key=="k0-s0"]', 0],
        ['[_key=="k1"]', 1],
        ['[_key=="k1"].children[_key=="k1-s0"]', 0],
        ['[_key=="k2"]', 2],
        ['[_key=="k3"]', 3],
        ['[_key=="k3"].children[_key=="k3-s0"]', 0],
        ['[_key=="k4"]', 4],
        ['[_key=="k4"].children[_key=="k4-s0"]', 0],
      ]),
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['[_key=="k0"]', 1],
        ['[_key=="k1"]', 2],
        ['[_key=="k3"]', 1],
        ['[_key=="k4"]', 2],
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
        ['[_key=="k0"]', 0],
        ['[_key=="k0"].children[_key=="k0-s0"]', 0],
        ['[_key=="k1"]', 1],
        ['[_key=="k1"].children[_key=="k1-s0"]', 0],
        ['[_key=="k2"]', 2],
        ['[_key=="k2"].children[_key=="k2-s0"]', 0],
      ]),
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['[_key=="k0"]', 1],
        ['[_key=="k1"]', 1],
        ['[_key=="k2"]', 1],
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
        ['[_key=="k0"]', 1],
        ['[_key=="k1"]', 1],
        ['[_key=="k2"]', 2],
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
        ['[_key=="k0"]', 1],
        ['[_key=="k1"]', 2],
        ['[_key=="k2"]', 1],
        ['[_key=="k3"]', 1],
        ['[_key=="k4"]', 1],
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
        ['[_key=="k0"]', 1],
        ['[_key=="k1"]', 2],
        ['[_key=="k2"]', 1],
        ['[_key=="k3"]', 1],
        ['[_key=="k4"]', 1],
        ['[_key=="k5"]', 1],
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
        ['[_key=="k0"]', 0],
        ['[_key=="k0"].children[_key=="k0-s0"]', 0],
        ['[_key=="k1"]', 1],
        ['[_key=="k1"].children[_key=="k1-s0"]', 0],
        ['[_key=="k2"]', 2],
        ['[_key=="k2"].children[_key=="k2-s0"]', 0],
        ['[_key=="k3"]', 3],
        ['[_key=="k3"].children[_key=="k3-s0"]', 0],
      ]),
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['[_key=="k0"]', 1],
        ['[_key=="k1"]', 1],
        ['[_key=="k2"]', 2],
        ['[_key=="k3"]', 2],
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
        ['[_key=="k0"]', 0],
        ['[_key=="k0"].children[_key=="k0-s0"]', 0],
        ['[_key=="k1"]', 1],
        ['[_key=="k1"].children[_key=="k1-s0"]', 0],
        ['[_key=="k2"]', 2],
        ['[_key=="k2"].children[_key=="k2-s0"]', 0],
      ]),
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['[_key=="k0"]', 1],
        ['[_key=="k1"]', 1],
        ['[_key=="k2"]', 1],
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
        ['[_key=="k0"]', 0],
        ['[_key=="k0"].children[_key=="k0-s0"]', 0],
        ['[_key=="k1"]', 1],
        ['[_key=="k1"].children[_key=="k1-s0"]', 0],
        ['[_key=="k2"]', 2],
        ['[_key=="k2"].children[_key=="k2-s0"]', 0],
        ['[_key=="k3"]', 3],
        ['[_key=="k3"].children[_key=="k3-s0"]', 0],
        ['[_key=="k4"]', 4],
        ['[_key=="k4"].children[_key=="k4-s0"]', 0],
        ['[_key=="k5"]', 5],
        ['[_key=="k5"].children[_key=="k5-s0"]', 0],
        ['[_key=="k6"]', 6],
        ['[_key=="k6"].children[_key=="k6-s0"]', 0],
        ['[_key=="k7"]', 7],
        ['[_key=="k7"].children[_key=="k7-s0"]', 0],
        ['[_key=="k8"]', 8],
        ['[_key=="k8"].children[_key=="k8-s0"]', 0],
      ]),
    )
    expect(listIndexMap).toEqual(
      new Map([
        ['[_key=="k0"]', 1],
        ['[_key=="k1"]', 1],
        ['[_key=="k2"]', 1],
        ['[_key=="k3"]', 1],
        ['[_key=="k4"]', 2],
        ['[_key=="k5"]', 1],
        ['[_key=="k6"]', 1],
        ['[_key=="k7"]', 2],
        ['[_key=="k8"]', 3],
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
        ['[_key=="k0"]', 1],
        ['[_key=="k1"]', 1],
        ['[_key=="k2"]', 2],
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
        ['[_key=="k0"]', 1],
        ['[_key=="k1"]', 1],
        ['[_key=="k3"]', 1],
      ]),
    )
  })
})
