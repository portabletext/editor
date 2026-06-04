import {describe, expectTypeOf, test} from 'vitest'
import type {defineContainer} from './renderer.types'

describe('defineContainer type guards', () => {
  test("forbids type: '*'", () => {
    expectTypeOf<
      Parameters<typeof defineContainer<'*'>>[0]['type']
    >().toEqualTypeOf<"Error: defineContainer({type: '*'}) is forbidden -- containers cannot be registered by wildcard">()
  })

  test("forbids type: 'span'", () => {
    expectTypeOf<
      Parameters<typeof defineContainer<'span'>>[0]['type']
    >().toEqualTypeOf<"Error: defineContainer({type: 'span'}) is forbidden -- 'span' is always a span, use defineSpan">()
  })

  test("forbids type: 'block'", () => {
    expectTypeOf<
      Parameters<typeof defineContainer<'block'>>[0]['type']
    >().toEqualTypeOf<"Error: defineContainer({type: 'block'}) is forbidden -- 'block' is always a text block, use defineTextBlock">()
  })

  test('accepts other string literal types', () => {
    expectTypeOf<
      Parameters<typeof defineContainer<'callout'>>[0]['type']
    >().toEqualTypeOf<'callout'>()
  })
})
