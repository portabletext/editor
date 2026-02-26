import type * as Y from 'yjs'
import type {Operation} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'

export type YjsOperationDirection = 'local-to-yjs' | 'yjs-to-slate'

export interface YjsOperationEntry {
  direction: YjsOperationDirection
  operations: Array<Operation>
  timestamp: number
}

export interface YjsEditorConfig {
  sharedRoot: Y.XmlText
  localOrigin: unknown
  onOperation?: (entry: YjsOperationEntry) => void
}

export interface YjsEditor extends PortableTextSlateEditor {
  sharedRoot: Y.XmlText
  localOrigin: unknown
  isYjsConnected: boolean
  connect: () => void
  disconnect: () => void
}
