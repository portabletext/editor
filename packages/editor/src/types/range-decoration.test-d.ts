import type {PropsWithChildren, ReactElement} from 'react'
import {describe, expectTypeOf, test} from 'vitest'
import type {Editor} from '../editor'
import type {EditorSelection} from './editor'
import type {
  RangeDecoration,
  RangeDecorationMapping,
  RangeDecorationRegistration,
  RangeDecorationRenderProps,
  RegistrableRangeDecoration,
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

describe('RegistrableRangeDecoration', () => {
  test('`range` rejects `null`', () => {
    const rangeDecoration: RegistrableRangeDecoration = {
      id: 'a',
      render: () => null as never,
      // @ts-expect-error - `range` is `NonNullable<EditorSelection>`; "no position" is omission, not `null`
      range: null,
    }

    void rangeDecoration
  })

  test('`range` rejects `undefined`', () => {
    const rangeDecoration: RegistrableRangeDecoration = {
      id: 'a',
      render: () => null as never,
      // @ts-expect-error
      range: undefined,
    }

    void rangeDecoration
  })

  test('`render` receives `RangeDecorationRenderProps`', () => {
    const render = (props: RangeDecorationRenderProps) =>
      props.children as unknown as ReactElement<any>

    const rangeDecoration: RegistrableRangeDecoration = {
      id: 'a',
      range,
      render,
    }

    void rangeDecoration
  })

  test('`payload` is not a property', () => {
    const rangeDecoration: RegistrableRangeDecoration = {
      id: 'a',
      range,
      render: () => null as never,
      // @ts-expect-error - identity is `id`; data closes over `render`
      payload: {foo: 'bar'},
    }

    void rangeDecoration
  })

  test('`onMoved` is not a property', () => {
    const rangeDecoration: RegistrableRangeDecoration = {
      id: 'a',
      range,
      render: () => null as never,
      // @ts-expect-error - moves are reported through `onMapped`, not per-decoration
      onMoved: () => {},
    }

    void rangeDecoration
  })
})

describe('registerRangeDecorations', () => {
  test('`onMapped` receives an `Array<RangeDecorationMapping>`', () => {
    editor.registerRangeDecorations({
      rangeDecorations: [],
      onMapped: (mappings) => {
        expectTypeOf(mappings).toEqualTypeOf<Array<RangeDecorationMapping>>()
      },
    })
  })

  test('returns a `RangeDecorationRegistration`', () => {
    expectTypeOf(
      editor.registerRangeDecorations({rangeDecorations: []}),
    ).toEqualTypeOf<RangeDecorationRegistration>()
  })
})
