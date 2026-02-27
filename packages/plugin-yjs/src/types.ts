import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type * as Y from 'yjs'

/**
 * @public
 */
export interface YjsPluginConfig {
  editor: {
    on: (
      event: 'patch',
      listener: (event: {type: 'patch'; patch: Patch}) => void,
    ) => {unsubscribe: () => void}
    send: (event: {
      type: 'patches'
      patches: Array<Patch>
      snapshot: Array<PortableTextBlock> | undefined
    }) => void
    getSnapshot: () => {context: {value: Array<PortableTextBlock> | undefined}}
  }
  yDoc: Y.Doc
  localOrigin?: unknown
}

/**
 * @public
 */
export interface YjsPluginInstance {
  connect: () => void
  disconnect: () => void
  yDoc: Y.Doc
  patchesArray: Y.Array<string>
}
