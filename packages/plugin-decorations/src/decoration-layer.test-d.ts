import type {Decoration, Editor, EditorSelection} from '@portabletext/editor'
import {describe, expectTypeOf, test} from 'vitest'
import {createDecorationLayer} from './create-decoration-layer'
import type {DecorationEvent, DecorationLayer} from './decoration.types'

declare const editor: Editor
declare const range: NonNullable<EditorSelection>

describe(createDecorationLayer.name, () => {
  test('`decorations` entries are core `Decoration`s, discriminant included', () => {
    createDecorationLayer(editor, {
      decorations: [
        {id: 'a', type: 'range', range, render: () => null as never},
      ],
    })

    createDecorationLayer(editor, {
      // @ts-expect-error -- `type` is required on `Decoration`
      decorations: [{id: 'a', range, render: () => null as never}],
    })

    expectTypeOf<
      Parameters<typeof createDecorationLayer>[1]['decorations']
    >().toEqualTypeOf<Array<Decoration>>()
  })

  test('`on` receives an `Array<DecorationEvent>`', () => {
    createDecorationLayer(editor, {
      decorations: [],
      on: (events) => {
        expectTypeOf(events).toEqualTypeOf<Array<DecorationEvent>>()
      },
    })
  })

  test('returns a `DecorationLayer`', () => {
    expectTypeOf(
      createDecorationLayer(editor, {decorations: []}),
    ).toEqualTypeOf<DecorationLayer>()
  })
})
