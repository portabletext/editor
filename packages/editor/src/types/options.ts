import type {BaseSyntheticEvent} from 'react'
import type {EditorStore} from '../editor-store'
import type {PortableTextEditor} from '../editor/PortableTextEditor'
import type {PatchObservable} from './editor'

/**
 * @internal
 */
export type createEditorOptions = {
  keyGenerator: () => string
  portableTextEditor: PortableTextEditor
  readOnly: boolean
  maxBlocks?: number
  store: EditorStore
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
