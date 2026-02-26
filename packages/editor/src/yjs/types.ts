import type * as Y from 'yjs'
import type {PortableTextSlateEditor} from '../types/slate-editor'

export interface YjsEditorConfig {
  sharedRoot: Y.XmlText
  localOrigin: unknown
}

export interface YjsEditor extends PortableTextSlateEditor {
  sharedRoot: Y.XmlText
  localOrigin: unknown
  isYjsConnected: boolean
  connect: () => void
  disconnect: () => void
}
