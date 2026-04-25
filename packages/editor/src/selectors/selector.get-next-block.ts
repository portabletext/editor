import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getSibling} from '../node-traversal/get-sibling'
import {getBlock} from '../node-traversal/is-block'
import type {BlockPath} from '../types/paths'
import {getSelectionEndBlock} from './selector.get-selection-end-block'

/**
 * Returns the block after the selection's end block within the same
 * container scope, if any.
 *
 * Siblings are resolved within the enclosing container (or the document root
 * if the selection is at root level). Never crosses container boundaries.
 *
 * @public
 */
export const getNextBlock: EditorSelector<
  {node: PortableTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  const selectionEndBlock = getSelectionEndBlock(snapshot)

  if (!selectionEndBlock) {
    return undefined
  }

  const next = getSibling(snapshot.context, selectionEndBlock.path, 'next')

  if (!next) {
    return undefined
  }

  return getBlock(snapshot.context, next.path)
}
