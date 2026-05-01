import {useSelector} from '@xstate/react'
import {useContext} from 'react'
import {useSlateStatic} from '../slate/react/hooks/use-slate-static'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {EditorActorContext} from './editor-actor-context'
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
 *
 * Must be called inside an `EditorProvider` — the hook resolves the editor
 * through React context.
 *
 * @example
 * Pass a selector as the only argument
 * ```tsx
 * import { useEditorSelector } from '@portabletext/editor'
 *
 * function MyComponent() {
 *  const value = useEditorSelector(selector)
 * }
 * ```
 * @example
 * Pass an inline selector. In this case, use the snapshot context to obtain
 * the schema.
 * ```tsx
 * import { useEditorSelector } from '@portabletext/editor'
 *
 * function MyComponent() {
 *  const schema = useEditorSelector((snapshot) => snapshot.context.schema)
 * }
 * ```
 * @group Hooks
 */
export function useEditorSelector<TSelected>(
  selector: EditorSelector<TSelected>,
  compare: (a: TSelected, b: TSelected) => boolean = defaultCompare,
) {
  const editorActor = useContext(EditorActorContext)
  const slateEditor = useSlateStatic()

  return useSelector(
    editorActor,
    (editorActorSnapshot) => {
      const snapshot = getEditorSnapshot({
        editorActorSnapshot,
        slateEditorInstance: slateEditor,
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
  const selection = slateEditorInstance.selection
    ? {...slateEditorInstance.selection}
    : null

  return {
    blockIndexMap: slateEditorInstance.blockIndexMap,
    context: {
      containers: slateEditorInstance.containers,
      converters: [...editorActorSnapshot.context.converters],
      keyGenerator: editorActorSnapshot.context.keyGenerator,
      readOnly: editorActorSnapshot.matches({'edit mode': 'read only'}),
      schema: editorActorSnapshot.context.schema,
      selection,
      value: slateEditorInstance.children,
    },
    decoratorState: slateEditorInstance.decoratorState,
  }
}
