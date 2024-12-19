import type {PortableTextSlateEditor} from '../types/editor'
import {fromSlateValue} from '../utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../utils/weakMaps'
import type {EditorActor} from './editor-machine'

export function getValue({
  editorActorSnapshot,
  slateEditorInstance,
}: {
  editorActorSnapshot: ReturnType<EditorActor['getSnapshot']>
  slateEditorInstance: PortableTextSlateEditor
}) {
  return fromSlateValue(
    slateEditorInstance.children,
    editorActorSnapshot.context.schema.block.name,
    KEY_TO_VALUE_ELEMENT.get(slateEditorInstance),
  )
}
