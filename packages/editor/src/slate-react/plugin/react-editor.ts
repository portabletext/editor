import type {Ancestor} from '../../slate'
import {DOMEditor, type DOMEditorInterface} from '../../slate-dom'
import type {Key} from '../../slate-dom'
import type {ChunkTree} from '../chunking/types'

/**
 * A React and DOM-specific version of the `Editor` interface.
 */

export interface ReactEditor extends DOMEditor {
  /**
   * Determines the chunk size used by the children chunking optimization. If
   * null is returned (which is the default), the chunking optimization is
   * disabled.
   */
  getChunkSize: (node: Ancestor) => number | null

  keyToChunkTree: WeakMap<Key, ChunkTree>
}

export interface ReactEditorInterface extends DOMEditorInterface {}

// eslint-disable-next-line no-redeclare
export const ReactEditor: ReactEditorInterface = DOMEditor
