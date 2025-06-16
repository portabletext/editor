import type {PortableTextListBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {getSelectedBlocks} from './selector.get-selected-blocks'

/**
 * @public
 */
export const getActiveListItem: EditorSelector<
  PortableTextListBlock['listItem'] | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const selectedBlocks = getSelectedBlocks(snapshot).map((block) => block.node)
  const selectedTextBlocks = selectedBlocks.filter((block) =>
    isTextBlock(snapshot.context, block),
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
