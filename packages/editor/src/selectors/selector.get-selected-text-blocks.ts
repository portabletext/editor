import {isTextBlock, type PortableTextTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../slate/interfaces/path'
import {getSelectedBlocks} from './selector.get-selected-blocks'

/**
 * Returns the text blocks touched by the selection, resolved at any depth.
 *
 * @public
 */
export const getSelectedTextBlocks: EditorSelector<
  Array<{node: PortableTextTextBlock; path: Path}>
> = (snapshot) => {
  return getSelectedBlocks(snapshot).filter(
    (entry): entry is {node: PortableTextTextBlock; path: Path} =>
      isTextBlock(snapshot.context, entry.node),
  )
}
