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
 * import {useEditor, useEditorSelector} from '@portabletext/editor'
 * import {getActiveStyle} from '@portabletext/editor/selectors'
 *
 * function MyComponent() {
 *  const editor = useEditor()
 *  const activeStyle = useEditorSelector(editor, getActiveStyle)
 * }
 * ```
 * @example
 * Pass an inline selector as the second argument.
 * In this case, use the editor context to obtain the schema.
 * ```tsx
 * import {useEditor, useEditorSelector} from '@portabletext/editor'
 *
 * function MyComponent() {
 *  const editor = useEditor()
 *  const schema = useEditorSelector(editor, (snapshot) => snapshot.context.schema)
 * }
 * ```
 * @group Hooks
 */
export function useEditorSelector<TSelected>(
  editor: Editor,
  selector: EditorSelector<TSelected>,
  compare: (a: TSelected, b: TSelected) => boolean = defaultCompare,
) {
  // The selector re-runs once per microtask burst, not once per operation,
  // because `editor.subscribe` coalesces the actor's emissions; see
  // `subscribeCoalesced`.
  //
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
