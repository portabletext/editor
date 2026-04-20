import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getAnchorBlock as getAnchorBlockTraversal} from '../node-traversal/get-anchor-block'
import type {Path} from '../slate/interfaces/path'

/**
 * Returns the block containing the anchor selection, resolved at any depth.
 *
 * When the anchor is inside an editable container (e.g. a code block's line),
 * this returns the innermost block ancestor (the line), not the outer
 * container. When the anchor is at root, behavior is unchanged.
 *
 * @public
 */
export const getAnchorBlock: EditorSelector<
  {node: PortableTextBlock; path: Path} | undefined
> = (snapshot) => getAnchorBlockTraversal(snapshot)
