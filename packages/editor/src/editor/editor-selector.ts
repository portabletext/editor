import {useSelector} from '@xstate/react'
import type {AnyActorRef} from 'xstate'
import type {Editor} from '../editor'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import type {EditorActor} from './editor-machine'
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

export function getEditorSnapshot({
  editorActorSnapshot,
  editorEngineInstance,
}: {
  editorActorSnapshot: ReturnType<EditorActor['getSnapshot']>
  editorEngineInstance: PortableTextEditorEngine
}): EditorSnapshot {
  return {
    blockIndexMap: editorEngineInstance.blockIndexMap,
    context: {
      containers: editorEngineInstance.publicContainers,
      converters: editorActorSnapshot.context.converters,
      keyGenerator: editorActorSnapshot.context.keyGenerator,
      readOnly: editorActorSnapshot.matches({'edit mode': 'read only'}),
      schema: editorActorSnapshot.context.schema,
      selection: editorEngineInstance.selection,
      value: editorEngineInstance.children,
    },
    decoratorState: editorEngineInstance.decoratorState,
  }
}
