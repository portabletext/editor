import type {
  Editor,
  EditorSelection,
  RegistrableRangeDecoration,
} from '@portabletext/editor'
import {describe, expectTypeOf, test} from 'vitest'
import {createRangeDecorationLayer} from './create-range-decoration-layer'
import {defineRangeDecoration} from './define-range-decoration'
import type {
  RangeDecorationEvent,
  RangeDecorationLayer,
} from './range-decoration.types'

declare const editor: Editor
declare const range: NonNullable<EditorSelection>

describe('defineRangeDecoration', () => {
  test('returns its argument, identity-typed', () => {
    const decoration: RegistrableRangeDecoration = {
      id: 'a',
      range,
      render: () => null as never,
    }

    expectTypeOf(defineRangeDecoration(decoration)).toEqualTypeOf(decoration)
  })
})

describe('createRangeDecorationLayer', () => {
  test('`on` receives an `Array<RangeDecorationEvent>`', () => {
    createRangeDecorationLayer(editor, {
      rangeDecorations: [],
      on: (events) => {
        expectTypeOf(events).toEqualTypeOf<Array<RangeDecorationEvent>>()
      },
    })
  })

  test('returns a `RangeDecorationLayer`', () => {
    expectTypeOf(
      createRangeDecorationLayer(editor, {rangeDecorations: []}),
    ).toEqualTypeOf<RangeDecorationLayer>()
  })
})
