import {fromSlateValue} from '../internal-utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../internal-utils/weakMaps'
import type {PortableTextSlateEditor} from '../types/editor'
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
