import {describe, expect, test} from 'vitest'
import {compileSchema, defineSchema} from '@portabletext/schema'
import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {fromTextspec} from './from-textspec'
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

function createKeyGenerator(): () => string {
  let counter = 0
  return () => {
    const key = `k${counter}`
    counter++
    return key
  }
}

describe('fromTextspec', () => {
  test('simple paragraph', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createKeyGenerator()},
      'P: Hello|',
    )

    expect(blocks).toHaveLength(1)
    const block = blocks[0]
    expect(block).toBeDefined()
    expect(block?._type).toBe('block')
    expect((block as PortableTextTextBlock).style).toBe('normal')
    expect((block as PortableTextTextBlock).children).toHaveLength(1)
    const span = (block as PortableTextTextBlock).children[0] as PortableTextSpan
    expect(span._type).toBe('span')
    expect(span.text).toBe('Hello')
    expect(span.marks).toEqual([])
  })

  test('heading', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createKeyGenerator()},
      'H1: Hello|',
    )

    expect(blocks).toHaveLength(1)
    expect((blocks[0] as PortableTextTextBlock).style).toBe('h1')
  })

  test('bold text (decorator)', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createKeyGenerator()},
      'P: [strong:bold]|',
    )

    expect(blocks).toHaveLength(1)
    const block = blocks[0] as PortableTextTextBlock
    expect(block.children).toHaveLength(1)
    const span = block.children[0] as PortableTextSpan
    expect(span.text).toBe('bold')
    expect(span.marks).toEqual(['strong'])
  })

  test('annotation (link)', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createKeyGenerator()},
      'P: [@link href="https://example.com":click here]|',
    )

    expect(blocks).toHaveLength(1)
    const block = blocks[0] as PortableTextTextBlock
    expect(block.children).toHaveLength(1)
    const span = block.children[0] as PortableTextSpan
    expect(span.text).toBe('click here')
    expect(span.marks).toHaveLength(1)

    const markKey = span.marks?.[0]
    expect(markKey).toBeDefined()
    expect(block.markDefs).toHaveLength(1)
    const markDef = block.markDefs?.[0]
    expect(markDef?._type).toBe('link')
    expect(markDef?._key).toBe(markKey)
    expect(markDef?.['href']).toBe('https://example.com')
  })

  test('mixed plain and marked text', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createKeyGenerator()},
      'P: Hello [strong:world]|',
    )

    expect(blocks).toHaveLength(1)
    const block = blocks[0] as PortableTextTextBlock
    expect(block.children).toHaveLength(2)

    const span1 = block.children[0] as PortableTextSpan
    expect(span1.text).toBe('Hello ')
    expect(span1.marks).toEqual([])

    const span2 = block.children[1] as PortableTextSpan
    expect(span2.text).toBe('world')
    expect(span2.marks).toEqual(['strong'])
  })

  test('block object', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createKeyGenerator()},
      '{IMAGE}|',
    )

    expect(blocks).toHaveLength(1)
    const block = blocks[0] as PortableTextObject
    expect(block._type).toBe('image')
  })

  test('simple bullet list', () => {
    const {blocks} = fromTextspec(
      {schema, keyGenerator: createKeyGenerator()},
      'UL:\n  LI: first\n  LI: second|',
    )

    expect(blocks).toHaveLength(2)
    const block1 = blocks[0] as PortableTextTextBlock
    expect(block1.listItem).toBe('bullet')
    expect(block1.level).toBe(1)
    expect((block1.children[0] as PortableTextSpan).text).toBe('first')

    const block2 = blocks[1] as PortableTextTextBlock
    expect(block2.listItem).toBe('bullet')
    expect(block2.level).toBe(1)
    expect((block2.children[0] as PortableTextSpan).text).toBe('second')
  })

  test('collapsed selection', () => {
    const {selection} = fromTextspec(
      {schema, keyGenerator: createKeyGenerator()},
      'P: Hello|',
    )

    expect(selection).not.toBeNull()
    expect(selection?.anchor.offset).toBe(5)
    expect(selection?.focus.offset).toBe(5)
  })

  test('range selection', () => {
    const {selection} = fromTextspec(
      {schema, keyGenerator: createKeyGenerator()},
      'P: ^Hello|',
    )

    expect(selection).not.toBeNull()
    expect(selection?.anchor.offset).toBe(0)
    expect(selection?.focus.offset).toBe(5)
  })
})

describe('round-trip', () => {
  test('simple paragraph', () => {
    const input = 'P: Hello'
    const {blocks} = fromTextspec({schema, keyGenerator: createKeyGenerator()}, input + '|')
    const output = toTextspec({schema, value: blocks})
    expect(output).toBe(input)
  })

  test('heading', () => {
    const input = 'H1: Hello'
    const {blocks} = fromTextspec({schema, keyGenerator: createKeyGenerator()}, input + '|')
    const output = toTextspec({schema, value: blocks})
    expect(output).toBe(input)
  })

  test('bold text', () => {
    const input = 'P: [strong:bold]'
    const {blocks} = fromTextspec({schema, keyGenerator: createKeyGenerator()}, input + '|')
    const output = toTextspec({schema, value: blocks})
    expect(output).toBe(input)
  })

  test('mixed text', () => {
    const input = 'P: Hello [strong:world]'
    const {blocks} = fromTextspec({schema, keyGenerator: createKeyGenerator()}, input + '|')
    const output = toTextspec({schema, value: blocks})
    expect(output).toBe(input)
  })

  test('multiple blocks', () => {
    const input = 'P: first\nP: second'
    const {blocks} = fromTextspec({schema, keyGenerator: createKeyGenerator()}, input.split('\n')[0] + '|\n' + input.split('\n')[1])
    const output = toTextspec({schema, value: blocks})
    expect(output).toBe(input)
  })

  test('bullet list', () => {
    const input = 'UL:\n  LI: first\n  LI: second'
    const {blocks} = fromTextspec({schema, keyGenerator: createKeyGenerator()}, input + '|')
    const output = toTextspec({schema, value: blocks})
    expect(output).toBe(input)
  })

  test('block object', () => {
    const input = '{IMAGE}'
    const {blocks} = fromTextspec({schema, keyGenerator: createKeyGenerator()}, input + '|')
    const output = toTextspec({schema, value: blocks})
    expect(output).toBe(input)
  })

  test('annotation', () => {
    const input = 'P: [@link href="https://example.com":click here]'
    const {blocks} = fromTextspec({schema, keyGenerator: createKeyGenerator()}, input + '|')
    const output = toTextspec({schema, value: blocks})
    expect(output).toBe(input)
  })

  test('inline object', () => {
    const input = 'P: text {stock-ticker} more'
    const {blocks} = fromTextspec({schema, keyGenerator: createKeyGenerator()}, input + '|')
    const output = toTextspec({schema, value: blocks})
    expect(output).toBe(input)
  })
})
