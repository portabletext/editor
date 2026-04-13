import {describe, expect, test} from 'vitest'
import {defineContainer} from './renderer.types'

describe(defineContainer.name, () => {
  test('returns the config as-is', () => {
    const render = ({children}: {children: unknown}) => children
    expect(
      defineContainer({
        scope: 'callout',
        field: 'content',
        render: render as any,
      }),
    ).toEqual({
      scope: 'callout',
      field: 'content',
      render,
    })
  })
})
