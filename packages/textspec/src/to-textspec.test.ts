import {describe, expect, test} from 'vitest'
import {compileSchema, defineSchema} from '@portabletext/schema'
import type {
  PortableTextBlock,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {toTextspec} from './to-textspec'

const schemaDefinition = defineSchema({
  annotations: [{name: 'comment'}, {name: 'link'}],
  decorators: [{name: 'em'}, {name: 'strong'}],
  blockObjects: [{name: 'image'}, {name: 'break'}],
  inlineObjects: [{name: 'stock-ticker'}],
  lists: [{name: 'bullet'}, {name: 'number'}],
  styles: [
    {name: 'normal'},
    {name: 'h1'},
    {name: 'h2'},
    {name: 'h3'},
    {name: 'h4'},
    {name: 'h5'},
    {name: 'h6'},
    {name: 'blockquote'},
  ],
})

const schema = compileSchema(schemaDefinition)

function block(props: Partial<PortableTextTextBlock> & {children: PortableTextTextBlock['children']}): PortableTextTextBlock {
  return {
    _type: 'block',
    _key: 'b0',
    style: 'normal',
    markDefs: [],
    ...props,
  }
}

function span(text: string, marks: Array<string> = []) {
  return {_type: 'span' as const, _key: 's0', text, marks}
}

describe('toTextspec', () => {
  test('simple paragraph', () => {
    const value: Array<PortableTextBlock> = [
      block({children: [span('Hello')]}),
    ]
    expect(toTextspec({schema, value})).toBe('P: Hello')
  })

  test('heading h1', () => {
    const value: Array<PortableTextBlock> = [
      block({_key: 'b0', style: 'h1', children: [span('Hello')]}),
    ]
    expect(toTextspec({schema, value})).toBe('H1: Hello')
  })

  test('blockquote', () => {
    const value: Array<PortableTextBlock> = [
      block({style: 'blockquote', children: [span('Quote')]}),
    ]
    expect(toTextspec({schema, value})).toBe('BLOCKQUOTE: Quote')
  })

  test('bold text (decorator)', () => {
    const value: Array<PortableTextBlock> = [
      block({children: [span('Hello', ['strong'])]}),
    ]
    expect(toTextspec({schema, value})).toBe('P: [strong:Hello]')
  })

  test('multiple decorators', () => {
    const value: Array<PortableTextBlock> = [
      block({children: [span('Hello', ['strong', 'em'])]}),
    ]
    expect(toTextspec({schema, value})).toBe('P: [strong:[em:Hello]]')
  })

  test('link annotation', () => {
    const value: Array<PortableTextBlock> = [
      block({
        children: [span('Hello', ['abc'])],
        markDefs: [{_type: 'link', _key: 'abc', href: 'https://example.com'}],
      }),
    ]
    expect(toTextspec({schema, value})).toBe(
      'P: [@link href="https://example.com":Hello]',
    )
  })

  test('decorator + annotation combined', () => {
    const value: Array<PortableTextBlock> = [
      block({
        children: [span('Hello', ['strong', 'abc'])],
        markDefs: [{_type: 'link', _key: 'abc', href: 'https://example.com'}],
      }),
    ]
    expect(toTextspec({schema, value})).toBe(
      'P: [strong:[@link href="https://example.com":Hello]]',
    )
  })

  test('mixed plain and marked text', () => {
    const value: Array<PortableTextBlock> = [
      block({
        children: [
          {_type: 'span', _key: 's0', text: 'Hello ', marks: []},
          {_type: 'span', _key: 's1', text: 'world', marks: ['strong']},
        ],
      }),
    ]
    expect(toTextspec({schema, value})).toBe('P: Hello [strong:world]')
  })

  test('block object', () => {
    const value: Array<PortableTextBlock> = [
      {_type: 'image', _key: 'b0'},
    ]
    expect(toTextspec({schema, value})).toBe('{IMAGE}')
  })

  test('inline object', () => {
    const value: Array<PortableTextBlock> = [
      block({
        children: [
          {_type: 'span', _key: 's0', text: 'text ', marks: []},
          {_type: 'stock-ticker', _key: 'i0'},
          {_type: 'span', _key: 's1', text: ' more', marks: []},
        ],
      }),
    ]
    expect(toTextspec({schema, value})).toBe('P: text {stock-ticker} more')
  })

  test('simple bullet list', () => {
    const value: Array<PortableTextBlock> = [
      block({_key: 'b0', listItem: 'bullet', level: 1, children: [span('first')]}),
      block({_key: 'b1', listItem: 'bullet', level: 1, children: [{_type: 'span', _key: 's1', text: 'second', marks: []}]}),
    ]
    expect(toTextspec({schema, value})).toBe('UL:\n  LI: first\n  LI: second')
  })

  test('numbered list', () => {
    const value: Array<PortableTextBlock> = [
      block({_key: 'b0', listItem: 'number', level: 1, children: [span('one')]}),
      block({_key: 'b1', listItem: 'number', level: 1, children: [{_type: 'span', _key: 's1', text: 'two', marks: []}]}),
    ]
    expect(toTextspec({schema, value})).toBe('OL:\n  LI: one\n  LI: two')
  })

  test('nested list', () => {
    const value: Array<PortableTextBlock> = [
      block({_key: 'b0', listItem: 'bullet', level: 1, children: [span('parent')]}),
      block({_key: 'b1', listItem: 'bullet', level: 2, children: [{_type: 'span', _key: 's1', text: 'child', marks: []}]}),
    ]
    expect(toTextspec({schema, value})).toBe(
      'UL:\n  LI:\n    P: parent\n    UL:\n      LI: child',
    )
  })

  test('multiple blocks', () => {
    const value: Array<PortableTextBlock> = [
      block({_key: 'b0', children: [span('first')]}),
      block({_key: 'b1', children: [{_type: 'span', _key: 's1', text: 'second', marks: []}]}),
    ]
    expect(toTextspec({schema, value})).toBe('P: first\nP: second')
  })

  test('selection - collapsed cursor', () => {
    const value: Array<PortableTextBlock> = [
      block({children: [span('Hello')]}),
    ]
    const selection = {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 5},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 5},
    }
    expect(toTextspec({schema, value, selection})).toBe('P: Hello|')
  })

  test('selection - range', () => {
    const value: Array<PortableTextBlock> = [
      block({children: [span('Hello')]}),
    ]
    const selection = {
      anchor: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 0},
      focus: {path: [{_key: 'b0'}, 'children', {_key: 's0'}], offset: 5},
    }
    expect(toTextspec({schema, value, selection})).toBe('P: ^Hello|')
  })

  test('empty span text', () => {
    const value: Array<PortableTextBlock> = [
      block({children: [span('')]}),
    ]
    expect(toTextspec({schema, value})).toBe('P: ')
  })
})
