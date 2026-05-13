import {describe, expect, test} from 'vitest'
import {defineContainer} from './renderer.types'

describe(defineContainer.name, () => {
  test('returns the config as-is', () => {
    const render = ({children}: {children: unknown}) => children
    expect(
      defineContainer({
        type: 'callout',
        childField: 'content',
        render: render as any,
      }),
    ).toEqual({
      type: 'callout',
      childField: 'content',
      render,
    })
  })

  test('returns the config with renderChild as-is', () => {
    const render = ({children}: {children: unknown}) => children
    const renderImage = ({children}: {children: unknown}) => children
    const config = defineContainer({
      type: 'callout',
      childField: 'content',
      render: render as any,
      renderChild: {
        image: renderImage as any,
      },
    })
    expect(config).toEqual({
      type: 'callout',
      childField: 'content',
      render,
      renderChild: {image: renderImage},
    })
  })
})
