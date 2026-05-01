import type {Editor} from '../editor'
import type {EditableAPI} from '../types/editor'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import type {EditorActor} from './editor-machine'

/**
 * Internal state attached to each Editor instance. Intentionally not exposed
 * on the Editor type; PTE-internal code retrieves it via `getInternalState`.
 * Consumers should use the public Editor API (`editor.send`, `editor.on`,
 * `editor.getSnapshot`, `editor.dom`) and selectors instead.
 */
export type InternalState = {
  editable: EditableAPI
  editorActor: EditorActor
  slateEditor: PortableTextSlateEditor
}

const REGISTRY = new WeakMap<Editor, InternalState>()

export function setInternalState(editor: Editor, state: InternalState): void {
  REGISTRY.set(editor, state)
}

export function getInternalState(editor: Editor): InternalState {
  const state = REGISTRY.get(editor)
  if (state === undefined) {
    throw new Error(
      'Editor was not initialized through createInternalEditor or has been garbage collected',
    )
  }
  return state
}
