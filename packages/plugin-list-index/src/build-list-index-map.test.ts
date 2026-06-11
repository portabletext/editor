import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {buildListIndexMap} from './build-list-index-map'

/**
 * These scenarios mirror the engine's `build-index-maps.test.ts`
 * (`listIndexMap` assertions). `buildListIndexMap` is a duplicate of the
 * engine's internal computation, and this suite is the drift alarm: if the
 * engine's list semantics change, update both implementations and both
 * suites together.
 */

function blockObject(_key: string, name: string) {
  return {
    _key,
    _type: name,
  }
}

let keyCounter = 0

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
        _key: `span-${keyCounter++}`,
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

describe(buildListIndexMap.name, () => {
  test('empty', () => {
    expect(buildListIndexMap({schema, value: []})).toEqual(new Map())
  })

  /**
   * #
   */
  test('single list item', () => {
    expect(
      buildListIndexMap({
        schema,
        value: [textBlock('k0', {listItem: 'number', level: 1})],
      }),
    ).toEqual(new Map([['[_key=="k0"]', 1]]))
  })

  /**
   *   #
   */
  test('single indented list item', () => {
    expect(
      buildListIndexMap({
        schema,
        value: [textBlock('k0', {listItem: 'number', level: 2})],
      }),
    ).toEqual(new Map([['[_key=="k0"]', 1]]))
  })

  /**
   * #
   * #
   *
   * #
   * #
   */
  test('two lists broken up by a paragraph', () => {
    expect(
      buildListIndexMap({
        schema,
        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          textBlock('k1', {listItem: 'number', level: 1}),
          textBlock('k2', {}),
          textBlock('k3', {listItem: 'number', level: 1}),
          textBlock('k4', {listItem: 'number', level: 1}),
        ],
      }),
    ).toEqual(
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
    expect(
      buildListIndexMap({
        schema,
        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          textBlock('k1', {listItem: 'number', level: 1}),
          blockObject('k2', 'image'),
          textBlock('k3', {listItem: 'number', level: 1}),
          textBlock('k4', {listItem: 'number', level: 1}),
        ],
      }),
    ).toEqual(
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
    expect(
      buildListIndexMap({
        schema,
        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          textBlock('k1', {listItem: 'bullet', level: 1}),
          textBlock('k2', {listItem: 'number', level: 1}),
        ],
      }),
    ).toEqual(
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
    expect(
      buildListIndexMap({
        schema,
        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          textBlock('k1', {listItem: 'bullet', level: 2}),
          textBlock('k2', {listItem: 'number', level: 1}),
        ],
      }),
    ).toEqual(
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
    expect(
      buildListIndexMap({
        schema,
        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          textBlock('k1', {listItem: 'number', level: 1}),
          textBlock('k2', {listItem: 'bullet', level: 1}),
          textBlock('k3', {listItem: 'bullet', level: 2}),
          textBlock('k4', {listItem: 'number', level: 1}),
        ],
      }),
    ).toEqual(
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
    expect(
      buildListIndexMap({
        schema,
        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          textBlock('k1', {listItem: 'number', level: 1}),
          textBlock('k2', {listItem: 'bullet', level: 2}),
          textBlock('k3', {listItem: 'bullet', level: 1}),
          textBlock('k4', {listItem: 'bullet', level: 2}),
          textBlock('k5', {listItem: 'number', level: 1}),
        ],
      }),
    ).toEqual(
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
    expect(
      buildListIndexMap({
        schema,
        value: [
          textBlock('k0', {listItem: 'number', level: 1}),
          textBlock('k1', {listItem: 'number', level: 2}),
          textBlock('k2', {listItem: 'number', level: 2}),
          textBlock('k3', {listItem: 'number', level: 1}),
        ],
      }),
    ).toEqual(
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
    expect(
      buildListIndexMap({
        schema,
        value: [
          textBlock('k0', {listItem: 'number', level: 2}),
          textBlock('k1', {listItem: 'number', level: 1}),
          textBlock('k2', {listItem: 'number', level: 2}),
        ],
      }),
    ).toEqual(
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
    expect(
      buildListIndexMap({
        schema,
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
      }),
    ).toEqual(
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
    expect(
      buildListIndexMap({
        schema,
        value: [
          textBlock('k0', {listItem: 'bullet', level: 1}),
          textBlock('k1', {listItem: 'number', level: 2}),
          textBlock('k2', {listItem: 'number', level: 2}),
        ],
      }),
    ).toEqual(
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
    expect(
      buildListIndexMap({
        schema,
        value: [
          textBlock('k0', {listItem: 'number', level: 2}),
          textBlock('k1', {listItem: 'bullet', level: 1}),
          textBlock('k3', {listItem: 'number', level: 2}),
        ],
      }),
    ).toEqual(
      new Map([
        ['[_key=="k0"]', 1],
        ['[_key=="k1"]', 1],
        ['[_key=="k3"]', 1],
      ]),
    )
  })
})
