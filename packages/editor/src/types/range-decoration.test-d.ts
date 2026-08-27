import type {PropsWithChildren, ReactElement} from 'react'
import {describe, expectTypeOf, test} from 'vitest'
import type {Editor} from '../editor'
import type {
  RangeDecoration,
  RangeDecorationEvent,
  RegistrableRangeDecoration,
} from './editor'

declare const editor: Editor

describe('RangeDecoration.component', () => {
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

describe('RegistrableRangeDecoration.component', () => {
  test('a component typed to take just PropsWithChildren is still assignable', () => {
    const component: (props: PropsWithChildren) => ReactElement<any> = (
      props,
    ) => props.children as ReactElement<any>

    const rangeDecoration: RegistrableRangeDecoration = {
      id: 'a',
      component,
      range: null,
    }

    void rangeDecoration
  })

  test('`onMoved` is no longer a property', () => {
    const rangeDecoration: RegistrableRangeDecoration = {
      id: 'a',
      component: () => null as never,
      range: null,
      // @ts-expect-error - `onMoved` moved to the registration-level `on` handler
      onMoved: () => {},
    }

    void rangeDecoration
  })
})

describe('registerRangeDecorations({on})', () => {
  test('`on` receives a `RangeDecorationEvent`', () => {
    editor.registerRangeDecorations({
      rangeDecorations: [],
      on: (event) => {
        expectTypeOf(event).toEqualTypeOf<RangeDecorationEvent>()
      },
    })
  })
})
