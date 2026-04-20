import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getFocusBlockObject as getFocusBlockObjectTraversal} from '../node-traversal/get-focus-block-object'
import type {Path} from '../slate/interfaces/path'

/**
 * Returns the void block object containing the focus selection, resolved at
 * any depth.
 *
 * Excludes void inline objects (whose parent is a text block) and editable
 * containers. When the focus is at root, behavior is unchanged.
 *
 * @public
 */
export const getFocusBlockObject: EditorSelector<
  {node: PortableTextObject; path: Path} | undefined
> = (snapshot) => getFocusBlockObjectTraversal(snapshot)
