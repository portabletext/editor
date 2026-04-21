import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getAncestors} from '../node-traversal/get-ancestors'
import {getBlock} from '../node-traversal/is-block'
import type {Path} from '../slate/interfaces/path'

/**
 * Returns the block containing the focus selection, resolved at any depth.
 *
 * When the focus is inside an editable container (e.g. a code block's line),
 * this returns the innermost block ancestor (the line), not the outer
 * container. When the focus is at root, behavior is unchanged.
 *
 * @public
 */
export const getFocusBlock: EditorSelector<
  {node: PortableTextBlock; path: Path} | undefined
> = (snapshot) => {
  const selection = snapshot.context.selection

  if (!selection) {
    return undefined
  }

  const focusPath = selection.focus.path
  const focusBlock = getBlock(snapshot.context, focusPath)

  if (focusBlock) {
    return focusBlock
  }

  for (const ancestor of getAncestors(snapshot.context, focusPath)) {
    const block = getBlock(snapshot.context, ancestor.path)

    if (block) {
      return block
    }
  }

  return undefined
}
