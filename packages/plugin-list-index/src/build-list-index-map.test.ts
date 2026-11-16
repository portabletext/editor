import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {buildListIndexMap, serializePath} from './build-list-index-map'

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

// Keep in sync with the writer cases in `packages/editor/src/paths/serialize-path.test.ts`.
describe(serializePath.name, () => {
  test('head true field', () => {
    expect(serializePath(['true'])).toEqual('true')
  })

  test('head false field', () => {
    expect(serializePath(['false'])).toEqual('false')
  })

  test('head null field', () => {
    expect(serializePath(['null'])).toEqual('null')
  })

  test('ordinary head field', () => {
    expect(serializePath(['body', 'content'])).toEqual('body.content')
  })

  test('empty path', () => {
    expect(serializePath([])).toEqual('')
  })

  test('single key segment', () => {
    expect(serializePath([{_key: 'k0'}])).toBe('[_key=="k0"]')
  })

  test('block and span', () => {
    expect(serializePath([{_key: 'k0'}, 'children', {_key: 's0'}])).toBe(
      '[_key=="k0"].children[_key=="s0"]',
    )
  })

  test('container path', () => {
    expect(
      serializePath([
        {_key: 'tableKey'},
        'rows',
        {_key: 'rowKey'},
        'cells',
        {_key: 'cellKey'},
        'content',
        {_key: 'blockKey'},
        'children',
        {_key: 'spanKey'},
      ]),
    ).toBe(
      '[_key=="tableKey"].rows[_key=="rowKey"].cells[_key=="cellKey"].content[_key=="blockKey"].children[_key=="spanKey"]',
    )
  })

  test('key with dot', () => {
    expect(serializePath([{_key: 'my.key'}, 'children', {_key: 's0'}])).toBe(
      '[_key=="my.key"].children[_key=="s0"]',
    )
  })
  test('head index', () => {
    expect(serializePath([2])).toEqual('[2]')
  })
  test('index after field', () => {
    expect(serializePath(['body', 2])).toEqual('body[2]')
  })
  test('range', () => {
    expect(serializePath([[1, 3]])).toEqual('[1:3]')
  })
  test('open start range', () => {
    expect(serializePath([['', 3]])).toEqual('[:3]')
  })
  test('open end range', () => {
    expect(serializePath([[1, '']])).toEqual('[1:]')
  })
  test('true field after key', () => {
    expect(serializePath([{_key: 'k0'}, 'true'])).toEqual(
      '[_key=="k0"]["true"]',
    )
  })
  test('false field after key', () => {
    expect(serializePath([{_key: 'k0'}, 'false'])).toEqual(
      '[_key=="k0"]["false"]',
    )
  })
  test('null field after key', () => {
    expect(serializePath([{_key: 'k0'}, 'null'])).toEqual(
      '[_key=="k0"]["null"]',
    )
  })
})
