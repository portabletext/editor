import type {Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import type * as Y from 'yjs'

/**
 * Bidirectional lookup between PT `_key` and `Y.XmlText`.
 *
 * Both directions need this:
 * - PT patch → Y.Doc: find Y.XmlText by block `_key`
 * - Y.Doc → PT patches: find `_key` from Y.XmlText reference
 *
 * Only tracks blocks (not spans). Spans are delta entries in
 * their parent block's Y.XmlText and are resolved by offset.
 *
 * @public
 */
export interface KeyMap {
  getYText(key: string): Y.XmlText | undefined
  getKey(yText: Y.XmlText): string | undefined
  set(key: string, yText: Y.XmlText): void
  delete(key: string): void
}

/**
 * @public
 */
export interface YjsPluginConfig {
  editor: {
    on: (
      event: 'mutation',
      listener: (event: {
        type: 'mutation'
        patches: Array<Patch>
        value: Array<PortableTextBlock> | undefined
      }) => void,
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
  sharedRoot: Y.XmlFragment
  keyMap: KeyMap
}
