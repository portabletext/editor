import {fromSlateValue} from '../utils/values'
import {KEY_TO_VALUE_ELEMENT} from '../utils/weakMaps'
import type {Editor} from './create-editor'

export function getValue(editor: Editor) {
  return fromSlateValue(
    editor._internal.slateEditor.instance.children,
    editor._internal.editorActor.getSnapshot().context.schema.block.name,
    KEY_TO_VALUE_ELEMENT.get(editor._internal.slateEditor.instance),
  )
}
