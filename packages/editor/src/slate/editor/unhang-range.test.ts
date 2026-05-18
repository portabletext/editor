import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {defineContainer} from '../../renderers/renderer.types'
import {resolveContainers} from '../../schema/resolve-containers'
import type {Node} from '../interfaces/node'
import {unhangRange} from './unhang-range'

/**
 * Build a context with the given root-level nodes. The schema declares a
 * single `image` block-object so void-block fixtures can use `{_type:
 * 'image'}`.
 */
function buildContext(...value: Array<Node>) {
  const schema = compileSchema(
    defineSchema({
      blockObjects: [{name: 'image'}],
    }),
  )
  const blockIndexMap = new Map<string, number>()
  value.forEach((node, index) => {
    blockIndexMap.set((node as {_key: string})._key, index)
  })
  return {
    context: {schema, containers: new Map(), value},
    blockIndexMap,
  }
}

const keyGenerator = createTestKeyGenerator()

const fooSpan = {_key: keyGenerator(), _type: 'span', text: 'foo', marks: []}
const fooBlock = {
  _key: keyGenerator(),
  _type: 'block',
  children: [fooSpan],
  markDefs: [],
  style: 'normal',
}
const barSpan = {_key: keyGenerator(), _type: 'span', text: 'bar', marks: []}
const barBlock = {
  _key: keyGenerator(),
  _type: 'block',
  children: [barSpan],
  markDefs: [],
  style: 'normal',
}
const bazSpan = {_key: keyGenerator(), _type: 'span', text: 'baz', marks: []}
const bazBlock = {
  _key: keyGenerator(),
  _type: 'block',
  children: [bazSpan],
  markDefs: [],
  style: 'normal',
}
const emptySpan = {_key: keyGenerator(), _type: 'span', text: '', marks: []}
const emptyBlock = {
  _key: keyGenerator(),
  _type: 'block',
  children: [emptySpan],
  markDefs: [],
  style: 'normal',
}
const image = {_key: keyGenerator(), _type: 'image'}

const fooStart = {
  path: [{_key: fooBlock._key}, 'children', {_key: fooSpan._key}],
  offset: 0,
}
const fooEnd = {
  path: [{_key: fooBlock._key}, 'children', {_key: fooSpan._key}],
  offset: fooSpan.text.length,
}
const barStart = {
  path: [{_key: barBlock._key}, 'children', {_key: barSpan._key}],
  offset: 0,
}
const bazStart = {
  path: [{_key: bazBlock._key}, 'children', {_key: bazSpan._key}],
  offset: 0,
}
const emptySpanStart = {
  path: [{_key: emptyBlock._key}, 'children', {_key: emptySpan._key}],
  offset: 0,
}
const imageStart = {
  path: [{_key: image._key}],
  offset: 0,
}

describe(unhangRange.name, () => {
  test('Returns the input range when collapsed', () => {
    const context = buildContext(fooBlock)
    const range = {anchor: fooStart, focus: fooStart}

    expect(unhangRange(context, range)).toEqual(range)
  })

  test('Returns the input range when end is mid-text', () => {
    const context = buildContext(fooBlock, barBlock)
    const range = {
      anchor: fooStart,
      focus: {...barStart, offset: 1},
    }

    expect(unhangRange(context, range)).toEqual(range)
  })

  test('Returns the input range when end has a previous sibling', () => {
    const sharedKeyGenerator = createTestKeyGenerator()
    const span1 = {
      _key: sharedKeyGenerator(),
      _type: 'span',
      text: 'foo',
      marks: [],
    }
    const span2 = {
      _key: sharedKeyGenerator(),
      _type: 'span',
      text: 'bar',
      marks: [],
    }
    const block = {
      _key: sharedKeyGenerator(),
      _type: 'block',
      children: [span1, span2],
      markDefs: [],
      style: 'normal',
    }
    const context = buildContext(block)
    const range = {
      anchor: {
        path: [{_key: block._key}, 'children', {_key: span1._key}],
        offset: 0,
      },
      focus: {
        path: [{_key: block._key}, 'children', {_key: span2._key}],
        offset: 0,
      },
    }

    expect(unhangRange(context, range)).toEqual(range)
  })

  test('Pulls a hanging focus back to the end of the previous block', () => {
    const context = buildContext(fooBlock, barBlock)
    // `(fooSpan:0, barSpan:0)` selects all of foo + zero chars of bar.
    // Unhang pulls focus back to end of fooSpan.
    const range = {anchor: fooStart, focus: barStart}

    expect(unhangRange(context, range)).toEqual({
      anchor: fooStart,
      focus: fooEnd,
    })
  })

  test('Pulls a hanging focus back across multiple text blocks', () => {
    const context = buildContext(fooBlock, barBlock, bazBlock)
    // Range hangs at start of baz (third block). Unhang lands on end of bar.
    const range = {anchor: fooStart, focus: bazStart}

    expect(unhangRange(context, range)).toEqual({
      anchor: fooStart,
      focus: {...barStart, offset: barSpan.text.length},
    })
  })

  test('Lands on an empty span when it is the last span before the end block', () => {
    const context = buildContext(fooBlock, emptyBlock, bazBlock)
    // unhangRange walks reverse spans and stops at the first one whose path
    // is before the end's block — even if that span is empty. The middle
    // block's empty span is the unhang target.
    const range = {anchor: fooStart, focus: bazStart}

    expect(unhangRange(context, range)).toEqual({
      anchor: fooStart,
      focus: emptySpanStart,
    })
  })

  test('Preserves the range when a void block sits between the endpoints', () => {
    const context = buildContext(fooBlock, image, barBlock)
    // Without the void guard, unhang would walk back through spans only and
    // collapse the range into fooBlock, silently dropping the image from the
    // user's selection.
    const range = {anchor: fooStart, focus: barStart}

    expect(unhangRange(context, range)).toEqual(range)
  })

  test('Preserves the range when end is at offset 0 of a void block', () => {
    const context = buildContext(fooBlock, image)
    // The PERF early-exit catches this: image has fooBlock as a previous
    // sibling, so the range isn't structurally hanging.
    const range = {anchor: fooStart, focus: imageStart}

    expect(unhangRange(context, range)).toEqual(range)
  })
})

// --- Container-aware tests ---

const calloutInnerSpan = {
  _key: keyGenerator(),
  _type: 'span',
  text: 'hello',
  marks: [],
}
const calloutInnerBlock = {
  _key: keyGenerator(),
  _type: 'block',
  children: [calloutInnerSpan],
  markDefs: [],
  style: 'normal',
}
const calloutBlock = {
  _key: keyGenerator(),
  _type: 'callout',
  content: [calloutInnerBlock],
}

const codeBlockInnerSpan = {
  _key: keyGenerator(),
  _type: 'span',
  text: 'const x',
  marks: [],
}
const codeBlockInnerBlock = {
  _key: keyGenerator(),
  _type: 'block',
  children: [codeBlockInnerSpan],
  markDefs: [],
  style: 'normal',
}
const codeBlockNode = {
  _key: keyGenerator(),
  _type: 'code-block',
  lines: [codeBlockInnerBlock],
}

const calloutInner1Span = {
  _key: keyGenerator(),
  _type: 'span',
  text: 'inner1',
  marks: [],
}
const calloutInner1Block = {
  _key: keyGenerator(),
  _type: 'block',
  children: [calloutInner1Span],
  markDefs: [],
  style: 'normal',
}
const calloutInner2Span = {
  _key: keyGenerator(),
  _type: 'span',
  text: 'inner2',
  marks: [],
}
const calloutInner2Block = {
  _key: keyGenerator(),
  _type: 'block',
  children: [calloutInner2Span],
  markDefs: [],
  style: 'normal',
}
const calloutWithTwoBlocks = {
  _key: keyGenerator(),
  _type: 'callout',
  content: [calloutInner1Block, calloutInner2Block],
}

const calloutInnerSpanStart = {
  path: [
    {_key: calloutBlock._key},
    'content',
    {_key: calloutInnerBlock._key},
    'children',
    {_key: calloutInnerSpan._key},
  ],
  offset: 0,
}
const calloutInnerSpanEnd = {
  path: [
    {_key: calloutBlock._key},
    'content',
    {_key: calloutInnerBlock._key},
    'children',
    {_key: calloutInnerSpan._key},
  ],
  offset: calloutInnerSpan.text.length,
}
const calloutInner1SpanStart = {
  path: [
    {_key: calloutWithTwoBlocks._key},
    'content',
    {_key: calloutInner1Block._key},
    'children',
    {_key: calloutInner1Span._key},
  ],
  offset: 0,
}
const calloutInner1SpanEnd = {
  path: [
    {_key: calloutWithTwoBlocks._key},
    'content',
    {_key: calloutInner1Block._key},
    'children',
    {_key: calloutInner1Span._key},
  ],
  offset: calloutInner1Span.text.length,
}
const calloutInner2SpanStart = {
  path: [
    {_key: calloutWithTwoBlocks._key},
    'content',
    {_key: calloutInner2Block._key},
    'children',
    {_key: calloutInner2Span._key},
  ],
  offset: 0,
}

function buildContainerContext(...value: Array<Node>) {
  const schema = compileSchema(
    defineSchema({
      blockObjects: [
        {name: 'image'},
        {
          name: 'callout',
          fields: [{name: 'content', type: 'array', of: [{type: 'block'}]}],
        },
        {
          name: 'code-block',
          fields: [{name: 'lines', type: 'array', of: [{type: 'block'}]}],
        },
      ],
    }),
  )
  const containers = resolveContainers(schema, [
    defineContainer({
      type: 'callout',
      arrayField: 'content',
    }),
    defineContainer({
      type: 'code-block',
      arrayField: 'lines',
    }),
  ])
  const blockIndexMap = new Map<string, number>()
  value.forEach((node, index) => {
    blockIndexMap.set((node as {_key: string})._key, index)
  })
  return {
    context: {schema, containers, value},
    blockIndexMap,
  }
}

describe(`${unhangRange.name} (container-aware)`, () => {
  test('Preserves the range when an editable container sits between the endpoints', () => {
    const context = buildContainerContext(fooBlock, calloutBlock, barBlock)
    const range = {anchor: fooStart, focus: barStart}

    expect(unhangRange(context, range)).toEqual(range)
  })

  test('Pulls a hanging focus back inside a container when both endpoints are inside it', () => {
    const context = buildContainerContext(calloutWithTwoBlocks)
    const range = {
      anchor: calloutInner1SpanStart,
      focus: calloutInner2SpanStart,
    }

    expect(unhangRange(context, range)).toEqual({
      anchor: calloutInner1SpanStart,
      focus: calloutInner1SpanEnd,
    })
  })

  test('Pulls a hanging focus when end is inside a container and start is outside', () => {
    const context = buildContainerContext(fooBlock, calloutBlock)
    const range = {anchor: fooStart, focus: calloutInnerSpanStart}

    expect(unhangRange(context, range)).toEqual({
      anchor: fooStart,
      focus: fooEnd,
    })
  })

  test('Pulls a hanging focus when start is inside a container and end is outside', () => {
    const context = buildContainerContext(calloutBlock, barBlock)
    const range = {anchor: calloutInnerSpanStart, focus: barStart}

    expect(unhangRange(context, range)).toEqual({
      anchor: calloutInnerSpanStart,
      focus: calloutInnerSpanEnd,
    })
  })

  test('Preserves the range when multiple editable containers sit between endpoints', () => {
    const context = buildContainerContext(
      fooBlock,
      calloutBlock,
      codeBlockNode,
      barBlock,
    )
    const range = {anchor: fooStart, focus: barStart}

    expect(unhangRange(context, range)).toEqual(range)
  })
})
