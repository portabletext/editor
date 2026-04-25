import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getEnclosingBlock} from '../node-traversal/get-enclosing-block'
import type {BlockPath} from '../types/paths'

/**
 * Returns the block containing the anchor selection, resolved at any depth.
 *
 * @public
 */
export const getAnchorBlock: EditorSelector<
  {node: PortableTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  const selection = snapshot.context.selection

  if (!selection) {
    return undefined
  }

  return getEnclosingBlock(snapshot.context, selection.anchor.path)
}
