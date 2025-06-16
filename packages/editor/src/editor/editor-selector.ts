import {useSelector} from '@xstate/react'
import type {Editor} from '../editor'
import type {PortableTextSlateEditor} from '../types/editor'
import type {InternalEditor} from './create-editor'
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
  return useSelector(
    (editor as InternalEditor)._internal.editorActor,
    (editorActorSnapshot) => {
      const snapshot = getEditorSnapshot({
        editorActorSnapshot,
        slateEditorInstance: (editor as InternalEditor)._internal.slateEditor
          .instance,
      })

      return selector(snapshot)
    },
    compare,
  )
}

export function getEditorSnapshot({
  editorActorSnapshot,
  slateEditorInstance,
}: {
  editorActorSnapshot: ReturnType<EditorActor['getSnapshot']>
  slateEditorInstance: PortableTextSlateEditor
}): EditorSnapshot {
  return {
    blockIndexMap: slateEditorInstance.blockIndexMap,
    context: {
      converters: [...editorActorSnapshot.context.converters],
      keyGenerator: editorActorSnapshot.context.keyGenerator,
      readOnly: editorActorSnapshot.matches({'edit mode': 'read only'}),
      schema: editorActorSnapshot.context.schema,
      selection: editorActorSnapshot.context.selection,
      value: slateEditorInstance.value,
    },
    decoratorState: slateEditorInstance.decoratorState,
  }
}
