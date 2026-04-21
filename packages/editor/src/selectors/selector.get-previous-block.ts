import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getSibling} from '../node-traversal/get-sibling'
import {getBlock} from '../node-traversal/is-block'
import type {Path} from '../slate/interfaces/path'
import {getSelectionStartBlock} from './selector.get-selection-start-block'

/**
 * Returns the block before the selection's start block within the same
 * container scope, if any.
 *
 * Siblings are resolved within the enclosing container (or the document root
 * if the selection is at root level). Never crosses container boundaries.
 *
 * @public
 */
export const getPreviousBlock: EditorSelector<
  {node: PortableTextBlock; path: Path} | undefined
> = (snapshot) => {
  const selectionStartBlock = getSelectionStartBlock(snapshot)

  if (!selectionStartBlock) {
    return undefined
  }

  const previous = getSibling(
    snapshot.context,
    selectionStartBlock.path,
    'previous',
  )

  if (!previous) {
    return undefined
  }

  return getBlock(snapshot.context, previous.path)
}
