import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@sanity/types'
import {describe, expect, test} from 'vitest'
import {keyGenerator} from '..'
import {compileSchemaDefinition} from '../editor/editor-schema'
import {defineSchema} from '../editor/editor-schema-definition'
import {sliceTextBlock} from './util.slice-text-block'

const schema = compileSchemaDefinition(
  defineSchema({
    inlineObjects: [{name: 'stock-ticker'}],
  }),
)

function createSpan(span: Partial<PortableTextSpan>) {
  return {
    _type: 'span',
    _key: span._key ?? keyGenerator(),
    text: span.text ?? '',
    marks: span.marks ?? [],
  }
}

function createInlineObject(inlineObject: Partial<PortableTextObject>) {
  return {
    _type: 'stock-ticker',
    _key: inlineObject._key ?? keyGenerator(),
    ...inlineObject,
  }
}

function createBlock(
  block: Partial<PortableTextTextBlock>,
): PortableTextTextBlock {
  return {
    _type: 'block',
    _key: block._key ?? keyGenerator(),
    children: block.children ?? [createSpan({})],
    markDefs: block.markDefs ?? [],
    style: block.style ?? 'normal',
    ...block,
  }
}

describe(sliceTextBlock.name, () => {
  test('empty block', () => {
    const span = createSpan({})
    const block = createBlock({
      children: [span],
    })

    expect(
      sliceTextBlock({
        context: {
          schema,
          selection: {
            anchor: {
              path: [{_key: block._key}, 'children', {_key: span._key}],
              offset: 0,
            },
            focus: {
              path: [{_key: block._key}, 'children', {_key: span._key}],
              offset: 0,
            },
          },
        },
        block,
      }),
    ).toEqual(block)
  })

  test('middle', () => {
    const span = createSpan({
      text: 'foo bar baz',
    })
    const block = createBlock({
      children: [span],
    })

    expect(
      sliceTextBlock({
        context: {
          schema,
          selection: {
            anchor: {
              path: [{_key: block._key}, 'children', {_key: span._key}],
              offset: 4,
            },
            focus: {
              path: [{_key: block._key}, 'children', {_key: span._key}],
              offset: 7,
            },
          },
        },
        block,
      }),
    ).toEqual({
      ...block,
      children: [
        {
          ...span,
          text: 'bar',
        },
      ],
    })
  })

  test('multiple children', () => {
    const fooSpan = createSpan({
      text: 'foo',
      marks: ['strong'],
    })
    const barSpan = createSpan({
      text: 'bar',
      marks: ['em'],
    })
    const bazSpan = createSpan({
      text: 'baz',
      marks: ['underline'],
    })
    const stockTicker = createInlineObject({
      symbol: 'AAPL',
    })
    const block = createBlock({
      children: [fooSpan, barSpan, stockTicker, bazSpan],
    })

    expect(
      sliceTextBlock({
        context: {
          schema,
          selection: {
            anchor: {
              path: [{_key: block._key}, 'children', {_key: barSpan._key}],
              offset: 1,
            },
            focus: {
              path: [{_key: block._key}, 'children', {_key: bazSpan._key}],
              offset: 1,
            },
          },
        },
        block,
      }),
    ).toEqual({
      ...block,
      children: [
        {
          ...barSpan,
          text: 'ar',
        },
        stockTicker,
        {
          ...bazSpan,
          text: 'b',
        },
      ],
    })
  })
})
