import {describe, expectTypeOf, test} from 'vitest'
import type {Editor} from '../editor'
import type {EditorEmittedEvent} from './relay'

declare const editor: Editor

describe('editor.on overloads', () => {
  test('a batched typed listener receives an array of the narrowed event', () => {
    editor.on(
      'operation',
      (events) => {
        expectTypeOf(events).toEqualTypeOf<
          Array<EditorEmittedEvent & {type: 'operation'}>
        >()
      },
      {batch: true},
    )
  })

  test("a batched '*' listener receives an array of every event", () => {
    editor.on(
      '*',
      (events) => {
        expectTypeOf(events).toEqualTypeOf<Array<EditorEmittedEvent>>()
      },
      {batch: true},
    )
  })

  test('an unbatched typed listener receives a single narrowed event', () => {
    editor.on('operation', (event) => {
      expectTypeOf(event).toEqualTypeOf<
        EditorEmittedEvent & {type: 'operation'}
      >()
    })
  })

  test('a single-event listener cannot be paired with batch: true', () => {
    const singleListener = (
      event: EditorEmittedEvent & {type: 'operation'},
    ) => {
      void event
    }
    // @ts-expect-error - batched delivery requires an array listener
    editor.on('operation', singleListener, {batch: true})
  })

  test('an array listener cannot be used without batch: true', () => {
    const arrayListener = (
      events: Array<EditorEmittedEvent & {type: 'operation'}>,
    ) => {
      void events
    }
    // @ts-expect-error - unbatched delivery is a single event, not an array
    editor.on('operation', arrayListener)
  })
})
