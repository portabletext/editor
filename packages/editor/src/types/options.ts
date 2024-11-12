import type {BaseSyntheticEvent} from 'react'
import type {EditorActor} from '../editor/editor-machine'
import type {PortableTextEditor} from '../editor/PortableTextEditor'

/**
 * @internal
 */
export type createEditorOptions = {
  editorActor: EditorActor
  subscriptions: Array<() => () => void>
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
