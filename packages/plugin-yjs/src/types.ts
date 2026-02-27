import type {Editor, MutationEvent} from '@portabletext/editor'
import type * as Y from 'yjs'

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

export type {MutationEvent}
