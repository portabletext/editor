import {useSelector} from '@xstate/react'
import {useSyncExternalStore} from 'react'
import {describe, test} from 'vitest'
import type {Editor} from './editor'
import type {EditorSnapshot} from './editor/editor-snapshot'

declare const editor: Editor

/**
 * The v7 release post claims the public `Editor` type satisfies
 * a standard `subscribe(observer) + getSnapshot()` contract that
 * three integration shapes consume directly:
 *
 * 1. React's `useSyncExternalStore`
 * 2. xstate's `useSelector` (from `@xstate/react`)
 * 3. rxjs `Observable` (constructed manually around `editor.subscribe`)
 *
 * This file pins those claims at the type level.
 */
describe('Editor as Subscribable<EditorSnapshot>', () => {
  test('Editor.subscribe accepts an observer-only argument and returns an unsubscribe handle', () => {
    const subscription = editor.subscribe({
      next: (snapshot: EditorSnapshot) => {
        snapshot.context.value
      },
      error: (err: unknown) => {
        err
      },
      complete: () => {},
    })
    const unsub: () => void = subscription.unsubscribe
    void unsub
  })

  test('Editor.subscribe accepts an observer with only a `next` handler', () => {
    const subscription = editor.subscribe({next: () => {}})
    const unsub: () => void = subscription.unsubscribe
    void unsub
  })

  test('Editor.getSnapshot returns an EditorSnapshot synchronously', () => {
    const snapshot: EditorSnapshot = editor.getSnapshot()
    void snapshot.context.value
  })

  test('useSyncExternalStore consumes editor.subscribe via a small adapter', () => {
    // The post shows this exact shape; it must compile.
    const length = useSyncExternalStore(
      (notify) => {
        const sub = editor.subscribe({next: () => notify()})
        return () => sub.unsubscribe()
      },
      () => editor.getSnapshot().context.value.length,
    )
    void length
  })

  test('Manual rxjs-style Observable wrapper compiles', () => {
    // The post shows wrapping the editor in `new Observable<T>(subscriber => ...)`.
    // We don't depend on rxjs in this package; replicate the relevant shape.
    type Subscriber<T> = {
      next: (value: T) => void
      error: (err: unknown) => void
      complete: () => void
    }
    type Teardown = () => void
    function createObservable<T>(
      factory: (subscriber: Subscriber<T>) => Teardown,
    ): {subscribe: (s: Subscriber<T>) => {unsubscribe: Teardown}} {
      return {
        subscribe(s) {
          const teardown = factory(s)
          return {unsubscribe: teardown}
        },
      }
    }

    const editor$ = createObservable<EditorSnapshot>((subscriber) => {
      const sub = editor.subscribe({
        next: (snap) => subscriber.next(snap),
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      })
      return () => sub.unsubscribe()
    })
    void editor$
  })

  test('xstate useSelector accepts the public Editor type directly', () => {
    // The function-form overload on `Editor.subscribe` is what allows direct
    // assignment to xstate's `Subscribable<T>` constraint, which still
    // includes the deprecated function-form overload alongside the
    // observer-form. PTE's implementation routes the function-form to the
    // observer-form internally.
    const length = useSelector(
      editor,
      (snap: EditorSnapshot) => snap.context.value.length,
    )
    void length
  })
})
