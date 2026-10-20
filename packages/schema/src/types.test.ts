import {describe, expect, test} from 'vitest'
import {compileSchema} from './compile-schema'
import {defineSchema} from './define-schema'
import {isSpan, isSpanNode, isTextBlock, isTextBlockNode} from './types'

const schema = compileSchema(defineSchema({}))

describe(isTextBlockNode.name, () => {
  test('matches a text block without `children`, unlike `isTextBlock`', () => {
    const node = {_type: 'block', _key: 'b1'}

    expect(isTextBlockNode({schema}, node)).toBe(true)
    expect(isTextBlock({schema}, node)).toBe(false)
  })

  test('rejects other types and untyped values', () => {
    expect(isTextBlockNode({schema}, {_type: 'span', _key: 's1'})).toBe(false)
    expect(isTextBlockNode({schema}, {_key: 'b1', children: []})).toBe(false)
    expect(isTextBlockNode({schema}, null)).toBe(false)
  })
})

describe(isSpanNode.name, () => {
  test('matches a span without `text`, unlike `isSpan`', () => {
    const node = {_type: 'span', _key: 's1'}

    expect(isSpanNode({schema}, node)).toBe(true)
    expect(isSpan({schema}, node)).toBe(false)
  })

  test('rejects other types and untyped values', () => {
    expect(isSpanNode({schema}, {_type: 'block', _key: 'b1'})).toBe(false)
    expect(isSpanNode({schema}, {_key: 's1', text: ''})).toBe(false)
    expect(isSpanNode({schema}, 'span')).toBe(false)
  })
})
