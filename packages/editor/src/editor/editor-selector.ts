import {useSelector} from '@xstate/react'
import type {AnyActorRef} from 'xstate'
import type {Editor} from '../editor'
import type {EditorSnapshot} from './editor-snapshot'

function defaultCompare<T>(a: T, b: T) {
  return a === b
}

/**
 * @public
 */
export type EditorSelector<TSelected> = (snapshot: EditorSnapshot) => TSelected

/**
 * @public
 * Hook to select a value from the editor state.
 * @example
 * Pass a selector as the second argument
 * ```tsx
 * import { useEditorSelector } from '@portabletext/editor'
 *
 * function MyComponent(editor) {
 *  const value = useEditorSelector(editor, selector)
 * }
 * ```
 * @example
 * Pass an inline selector as the second argument.
 * In this case, use the editor context to obtain the schema.
 * ```tsx
 * import { useEditorSelector } from '@portabletext/editor'
 *
 * function MyComponent(editor) {
 *  const schema = useEditorSelector(editor, (snapshot) => snapshot.context.schema)
 * }
 * ```
 * @example
 * Pass a `compare` function as the third argument for selectors that
 * return a fresh array or object on every call. Selectors like
 * {@link getSelectedValue}, {@link getFocusBlock}, and
 * {@link getApplicableSchema} allocate new aggregates per read. The
 * default `===` comparator will treat each as a change and trigger a
 * re-render even when the underlying state is identical.
 * ```tsx
 * import { useEditorSelector, getSelectedValue } from '@portabletext/editor'
 * import { isEqual } from 'lodash'
 *
 * function MyComponent(editor) {
 *  const selected = useEditorSelector(editor, getSelectedValue, isEqual)
 * }
 * ```
 * @group Hooks
 */
export function useEditorSelector<TSelected>(
  editor: Editor,
  selector: EditorSelector<TSelected>,
  compare: (a: TSelected, b: TSelected) => boolean = defaultCompare,
) {
  // `useSelector` is typed against xstate's `Subscribable<T>` which has both
  // observer-form and the deprecated function-form `subscribe` overloads.
  // We only expose the modern observer-form; the cast bridges that gap
  // without leaking the deprecated overload into our public `Editor` type.
  return useSelector(
    editor as unknown as Pick<AnyActorRef, 'subscribe' | 'getSnapshot'>,
    selector,
    compare,
  )
}
