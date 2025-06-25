import type {PortableTextBlock} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {compileSchemaDefinition} from '../editor/editor-schema'
import {defineSchema} from '../editor/editor-schema-definition'
import {defaultKeyGenerator} from '../editor/key-generator'
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

const schema = compileSchemaDefinition(
  defineSchema({
    blockObjects: [{name: 'image'}],
  }),
)

describe(buildIndexMaps.name, () => {
  const blockIndexMap = new Map<string, number>()
  const listIndexMap = new Map<string, number>()

  test('empty', () => {
    buildIndexMaps({schema, value: []}, {blockIndexMap, listIndexMap})
    expect(blockIndexMap).toEqual(new Map())
    expect(listIndexMap).toEqual(new Map())
  })

  test('single list item', () => {
    buildIndexMaps(
      {schema, value: [textBlock('k0', {listItem: 'number', level: 1})]},
      {blockIndexMap, listIndexMap},
    )
    expect(blockIndexMap).toEqual(new Map([['k0', 0]]))
    expect(listIndexMap).toEqual(new Map([['k0', 1]]))
  })

  test('single indented list item', () => {
    buildIndexMaps(
      {schema, value: [textBlock('k0', {listItem: 'number', level: 2})]},
      {blockIndexMap, listIndexMap},
    )
    expect(blockIndexMap).toEqual(new Map([['k0', 0]]))
    expect(listIndexMap).toEqual(new Map([['k0', 1]]))
  })

  test('two lists broken up by a paragraph', () => {
    buildIndexMaps(
      {
        schema,
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

  test('two lists broken up by an image', () => {
    buildIndexMaps(
      {
        schema,
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

  test('numbered lists broken up by a bulleted list', () => {
    expect(
      buildIndexMaps(
        {
          schema,
          value: [
            textBlock('k0', {listItem: 'number', level: 1}),
            textBlock('k1', {listItem: 'bullet', level: 1}),
            textBlock('k2', {listItem: 'number', level: 1}),
          ],
        },
        {blockIndexMap, listIndexMap},
      ),
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

  test('simple indented list', () => {
    buildIndexMaps(
      {
        schema,
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

  test('reverse indented list', () => {
    expect(
      buildIndexMaps(
        {
          schema,
          value: [
            textBlock('k0', {listItem: 'number', level: 2}),
            textBlock('k1', {listItem: 'number', level: 1}),
            textBlock('k2', {listItem: 'number', level: 2}),
          ],
        },
        {blockIndexMap, listIndexMap},
      ),
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

  test('complex list', () => {
    buildIndexMaps(
      {
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
})
