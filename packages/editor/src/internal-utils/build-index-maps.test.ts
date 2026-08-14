import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {buildIndexMaps} from './build-index-maps'

function textBlock(_key: string): PortableTextBlock {
  return {
    _key,
    _type: 'block',
    children: [
      {
        _key: `${_key}-s0`,
        _type: 'span',
        text: 'foo',
      },
    ],
    style: 'normal',
  }
}

const schema = compileSchema(
  defineSchema({
    blockObjects: [{name: 'image'}],
  }),
)

describe(buildIndexMaps.name, () => {
  const blockIndexMap = new Map<string, number>()

  test('empty', () => {
    buildIndexMaps({schema, containers: new Map(), value: []}, {blockIndexMap})
    expect(blockIndexMap).toEqual(new Map())
  })

  test('text blocks with children', () => {
    buildIndexMaps(
      {
        schema,
        containers: new Map(),
        value: [textBlock('k0'), textBlock('k1')],
      },
      {blockIndexMap},
    )
    expect(blockIndexMap).toEqual(
      new Map([
        ['[_key=="k0"]', 0],
        ['[_key=="k0"].children[_key=="k0-s0"]', 0],
        ['[_key=="k1"]', 1],
        ['[_key=="k1"].children[_key=="k1-s0"]', 0],
      ]),
    )
  })

  test('block objects without children', () => {
    buildIndexMaps(
      {
        schema,
        containers: new Map(),
        value: [textBlock('k0'), {_key: 'k1', _type: 'image'}, textBlock('k2')],
      },
      {blockIndexMap},
    )
    expect(blockIndexMap).toEqual(
      new Map([
        ['[_key=="k0"]', 0],
        ['[_key=="k0"].children[_key=="k0-s0"]', 0],
        ['[_key=="k1"]', 1],
        ['[_key=="k2"]', 2],
        ['[_key=="k2"].children[_key=="k2-s0"]', 0],
      ]),
    )
  })
})
