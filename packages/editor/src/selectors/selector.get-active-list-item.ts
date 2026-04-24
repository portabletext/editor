import type {PortableTextListBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getSelectedTextBlocks} from './selector.get-selected-text-blocks'

/**
 * @public
 */
export const getActiveListItem: EditorSelector<
  PortableTextListBlock['listItem'] | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const selectedTextBlocks = getSelectedTextBlocks(snapshot).map(
    (block) => block.node,
  )
  const firstTextBlock = selectedTextBlocks.at(0)

  if (!firstTextBlock) {
    return undefined
  }

  const firstListItem = firstTextBlock.listItem

  if (!firstListItem) {
    return undefined
  }

  if (selectedTextBlocks.every((block) => block.listItem === firstListItem)) {
    return firstListItem
  }

  return undefined
}
