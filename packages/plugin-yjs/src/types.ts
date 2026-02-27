import type * as Y from 'yjs'
import type {Editor} from '@portabletext/editor'

export interface YjsPluginConfig {
  editor: Editor
  yDoc: Y.Doc
  localOrigin?: unknown
}

export interface YjsPluginInstance {
  connect: () => void
  disconnect: () => void
  syncInitialState: (value: Array<any> | undefined) => void
  yDoc: Y.Doc
  blocksMap: Y.Map<any>
  orderArray: Y.Array<string>
}
