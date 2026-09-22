import type {PropsWithChildren, ReactElement} from 'react'
import {describe, expectTypeOf, test} from 'vitest'
import type {Editor} from '../editor'
import type {EditorSelection} from './editor'
import type {
  Decoration,
  DecorationMapping,
  DecorationRegistration,
  DecorationRenderProps,
  RangeDecoration,
} from './editor'

declare const editor: Editor
declare const range: NonNullable<EditorSelection>

describe('RangeDecoration.component', () => {
  test('stays `(props: PropsWithChildren) => ReactElement`, untouched by the registered surface', () => {
    expectTypeOf<RangeDecoration['component']>().parameters.toEqualTypeOf<
      [PropsWithChildren]
    >()
  })

  test('a component typed to take just PropsWithChildren is still assignable', () => {
    const component: (props: PropsWithChildren) => ReactElement<any> = (
      props,
    ) => props.children as ReactElement<any>

    const rangeDecoration: RangeDecoration = {
      component,
      selection: null,
    }

    void rangeDecoration
  })
})

describe('Decoration', () => {
  test("`type` rejects anything other than `'range'`", () => {
    const decoration: Decoration = {
      id: 'a',
      // @ts-expect-error - only `'range'` exists today
      type: 'point',
      render: () => null as never,
      range,
    }

    void decoration
  })

  test('`type` is required', () => {
    // @ts-expect-error - `type` is required, not defaulted
    const decoration: Decoration = {
      id: 'a',
      render: () => null as never,
      range,
    }

    void decoration
  })

  test('`range` rejects `null`', () => {
    const decoration: Decoration = {
      id: 'a',
      type: 'range',
      render: () => null as never,
      // @ts-expect-error - `range` is `NonNullable<EditorSelection>`; "no position" is omission, not `null`
      range: null,
    }

    void decoration
  })

  test('`range` rejects `undefined`', () => {
    const decoration: Decoration = {
      id: 'a',
      type: 'range',
      render: () => null as never,
      // @ts-expect-error
      range: undefined,
    }

    void decoration
  })

  test('`render` receives `DecorationRenderProps`', () => {
    const render = (props: DecorationRenderProps) =>
      props.children as unknown as ReactElement<any>

    const decoration: Decoration = {
      id: 'a',
      type: 'range',
      range,
      render,
    }

    void decoration
  })

  test('`payload` is not a property', () => {
    const decoration: Decoration = {
      id: 'a',
      type: 'range',
      range,
      render: () => null as never,
      // @ts-expect-error - identity is `id`; data closes over `render`
      payload: {foo: 'bar'},
    }

    void decoration
  })

  test('`onMoved` is not a property', () => {
    const decoration: Decoration = {
      id: 'a',
      type: 'range',
      range,
      render: () => null as never,
      // @ts-expect-error - moves are reported through `onMapped`, not per-decoration
      onMoved: () => {},
    }

    void decoration
  })
})

describe('registerDecorations', () => {
  test('`onMapped` receives an `Array<DecorationMapping>`', () => {
    editor.registerDecorations({
      decorations: [],
      onMapped: (mappings) => {
        expectTypeOf(mappings).toEqualTypeOf<Array<DecorationMapping>>()
      },
    })
  })

  test('returns a `DecorationRegistration`', () => {
    expectTypeOf(
      editor.registerDecorations({decorations: []}),
    ).toEqualTypeOf<DecorationRegistration>()
  })
})
