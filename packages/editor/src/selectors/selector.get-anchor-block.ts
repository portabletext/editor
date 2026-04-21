import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getAncestors} from '../node-traversal/get-ancestors'
import {getBlock} from '../node-traversal/is-block'
import type {Path} from '../slate/interfaces/path'

/**
 * Returns the block containing the anchor selection, resolved at any depth.
 *
 * @public
 */
export const getAnchorBlock: EditorSelector<
  {node: PortableTextBlock; path: Path} | undefined
> = (snapshot) => {
  const selection = snapshot.context.selection

  if (!selection) {
    return undefined
  }

  const anchorPath = selection.anchor.path
  const anchorBlock = getBlock(snapshot.context, anchorPath)

  if (anchorBlock) {
    return anchorBlock
  }

  for (const ancestor of getAncestors(snapshot.context, anchorPath)) {
    const block = getBlock(snapshot.context, ancestor.path)

    if (block) {
      return block
    }
  }

  return undefined
}
