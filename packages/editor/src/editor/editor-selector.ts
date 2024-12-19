import {useSelector} from '@xstate/react'
import type {PortableTextSlateEditor} from '../types/editor'
import type {Editor} from './create-editor'
import type {EditorActor} from './editor-machine'
import type {EditorSnapshot} from './editor-snapshot'
import {getActiveDecorators} from './get-active-decorators'
import {getValue} from './get-value'

function defaultCompare<T>(a: T, b: T) {
  return a === b
}

/**
 * @public
 */
export type EditorSelector<TSelected> = (snapshot: EditorSnapshot) => TSelected

/**
 * @public
 */
export function useEditorSelector<TSelected>(
  editor: Editor,
  selector: EditorSelector<TSelected>,
  compare: (a: TSelected, b: TSelected) => boolean = defaultCompare,
) {
  return useSelector(
    editor._internal.editorActor,
    (editorActorSnapshot) => {
      const snapshot = getEditorSnapshot({
        editorActorSnapshot,
        slateEditorInstance: editor._internal.slateEditor.instance,
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
    context: {
      activeDecorators: getActiveDecorators({
        schema: editorActorSnapshot.context.schema,
        slateEditorInstance,
      }),
      keyGenerator: editorActorSnapshot.context.keyGenerator,
      schema: editorActorSnapshot.context.schema,
      selection: editorActorSnapshot.context.selection,
      value: getValue({editorActorSnapshot, slateEditorInstance}),
    },
  }
}
