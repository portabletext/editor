import type {PortableTextListBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'
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

  const selectedTextBlocks = getSelectedTextBlocks(snapshot)
  const firstTextBlock = selectedTextBlocks.at(0)

  if (!firstTextBlock) {
    return undefined
  }

  const firstListItem = firstTextBlock.node.listItem

  if (!firstListItem) {
    return undefined
  }

  // Skip blocks whose sub-schema does not declare the list. A list item
  // is active when every in-scope block carries it.
  const inScopeBlocks = selectedTextBlocks.filter((block) =>
    getPathSubSchema(snapshot, block.path).lists.some(
      (l) => l.name === firstListItem,
    ),
  )

  if (inScopeBlocks.every((block) => block.node.listItem === firstListItem)) {
    return firstListItem
  }

  return undefined
}
