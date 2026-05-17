import type {ReactElement} from 'react'
import {describe, expect, test} from 'vitest'
import {
  defineBlockObject,
  defineContainer,
  defineInlineObject,
  defineSpan,
  defineTextBlock,
} from './renderer.types'

describe(defineContainer.name, () => {
  test('returns the config with injected kind: "container"', () => {
    const render = ({children}: {children: ReactElement}) => children
    expect(
      defineContainer({
        type: 'callout',
        arrayField: 'content',
        render,
      }),
    ).toEqual({
      kind: 'container',
      type: 'callout',
      arrayField: 'content',
      render,
    })
  })

  test("rejects type: 'span' at compile time", () => {
    const render = ({children}: {children: ReactElement}) => children
    defineContainer({
      // @ts-expect-error - 'span' is always a span, use defineSpan
      type: 'span',
      arrayField: 'content',
      render,
    })
  })

  test("rejects type: 'block' at compile time", () => {
    const render = ({children}: {children: ReactElement}) => children
    defineContainer({
      // @ts-expect-error - 'block' is always a text block, use defineTextBlock
      type: 'block',
      arrayField: 'content',
      render,
    })
  })
})

describe(defineSpan.name, () => {
  test('returns the config with injected kind: "span"', () => {
    const render = ({children}: {children: ReactElement}) => children
    expect(
      defineSpan({
        type: 'span',
        render,
      }),
    ).toEqual({
      kind: 'span',
      type: 'span',
      render,
    })
  })

  test("rejects type: 'block' at compile time", () => {
    const render = ({children}: {children: ReactElement}) => children
    defineSpan({
      // @ts-expect-error - 'block' is always a text block, use defineTextBlock
      type: 'block',
      render,
    })
  })
})

describe(defineBlockObject.name, () => {
  test('returns the config with injected kind: "blockObject"', () => {
    const render = ({children}: {children: ReactElement}) => children
    expect(
      defineBlockObject({
        type: 'image',
        render,
      }),
    ).toEqual({
      kind: 'blockObject',
      type: 'image',
      render,
    })
  })

  test("rejects type: 'block' at compile time", () => {
    const render = ({children}: {children: ReactElement}) => children
    defineBlockObject({
      // @ts-expect-error - 'block' is always a text block
      type: 'block',
      render,
    })
  })

  test("rejects type: 'span' at compile time", () => {
    const render = ({children}: {children: ReactElement}) => children
    defineBlockObject({
      // @ts-expect-error - 'span' is always a span
      type: 'span',
      render,
    })
  })
})

describe(defineInlineObject.name, () => {
  test('returns the config with injected kind: "inlineObject"', () => {
    const render = ({children}: {children: ReactElement}) => children
    expect(
      defineInlineObject({
        type: 'mention',
        render,
      }),
    ).toEqual({
      kind: 'inlineObject',
      type: 'mention',
      render,
    })
  })

  test("rejects type: 'block' at compile time", () => {
    const render = ({children}: {children: ReactElement}) => children
    defineInlineObject({
      // @ts-expect-error - 'block' is always a text block
      type: 'block',
      render,
    })
  })

  test("rejects type: 'span' at compile time", () => {
    const render = ({children}: {children: ReactElement}) => children
    defineInlineObject({
      // @ts-expect-error - 'span' is always a span
      type: 'span',
      render,
    })
  })
})

describe(defineTextBlock.name, () => {
  test('returns the config with injected kind: "textBlock"', () => {
    const render = ({children}: {children: ReactElement}) => children
    expect(
      defineTextBlock({
        type: 'block',
        render,
      }),
    ).toEqual({
      kind: 'textBlock',
      type: 'block',
      render,
    })
  })

  test("rejects type: 'span' at compile time", () => {
    const render = ({children}: {children: ReactElement}) => children
    defineTextBlock({
      // @ts-expect-error - 'span' is always a span
      type: 'span',
      render,
    })
  })
})
