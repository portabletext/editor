import {isTextBlock, type PortableTextTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {BlockPath} from '../types/paths'
import {getSelectedBlocks} from './selector.get-selected-blocks'

/**
 * Returns the text blocks touched by the selection, resolved at any depth.
 *
 * @public
 */
export const getSelectedTextBlocks: EditorSelector<
  Array<{node: PortableTextTextBlock; path: BlockPath}>
> = (snapshot) => {
  return getSelectedBlocks(snapshot).filter(
    (entry): entry is {node: PortableTextTextBlock; path: BlockPath} =>
      isTextBlock(snapshot.context, entry.node),
  )
}
