import type {ReactElement} from 'react'
import {describe, expect, test} from 'vitest'
import {defineContainer, defineLeaf, defineTextBlock} from './renderer.types'

describe(defineContainer.name, () => {
  test('returns the config with injected kind: "container"', () => {
    const render = ({children}: {children: ReactElement}) => children
    expect(
      defineContainer({
        type: 'callout',
        childField: 'content',
        render,
      }),
    ).toEqual({
      kind: 'container',
      type: 'callout',
      childField: 'content',
      render,
    })
  })

  test("rejects type: 'span' at compile time", () => {
    const render = ({children}: {children: ReactElement}) => children
    defineContainer({
      // @ts-expect-error - 'span' is always a leaf
      type: 'span',
      render,
    })
  })

  test("rejects type: 'block' at compile time", () => {
    const render = ({children}: {children: ReactElement}) => children
    defineContainer({
      // @ts-expect-error - 'block' is always a text block, use defineTextBlock
      type: 'block',
      render,
    })
  })
})

describe(defineLeaf.name, () => {
  test('returns the config with injected kind: "leaf"', () => {
    const render = ({children}: {children: ReactElement}) => children
    expect(
      defineLeaf({
        type: 'image',
        render,
      }),
    ).toEqual({
      kind: 'leaf',
      type: 'image',
      render,
    })
  })

  test("rejects type: 'block' at compile time", () => {
    const render = ({children}: {children: ReactElement}) => children
    defineLeaf({
      // @ts-expect-error - 'block' is always a container
      type: 'block',
      render,
    })
  })
})

describe(defineTextBlock.name, () => {
  test('returns the config with injected kind: "text"', () => {
    const render = ({children}: {children: ReactElement}) => children
    expect(
      defineTextBlock({
        type: 'block',
        render,
      }),
    ).toEqual({
      kind: 'text',
      type: 'block',
      render,
    })
  })

  test("rejects type other than 'block' at compile time", () => {
    const render = ({children}: {children: ReactElement}) => children
    defineTextBlock({
      // @ts-expect-error - type must be 'block'
      type: 'paragraph',
      render,
    })
  })
})
