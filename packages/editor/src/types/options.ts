import type {BaseSyntheticEvent} from 'react'
import type {EditorActor} from '../editor-machine'
import type {PortableTextEditor} from '../editor/PortableTextEditor'
import type {PatchObservable} from './editor'

/**
 * @internal
 */
export type createEditorOptions = {
  editorActor: EditorActor
  keyGenerator: () => string
  portableTextEditor: PortableTextEditor
  readOnly: boolean
  maxBlocks?: number
}

/**
 * @beta
 */
export type HotkeyOptions = {
  marks?: Record<string, string>
  custom?: Record<
    string,
    (event: BaseSyntheticEvent, editor: PortableTextEditor) => void
  >
}
