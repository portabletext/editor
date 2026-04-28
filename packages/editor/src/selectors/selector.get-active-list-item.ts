import type {PortableTextListBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
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

  // Blocks whose sub-schema doesn't declare any list item are out of
  // scope: they can't carry a list item and shouldn't vote. The active
  // list item is the one shared by every in-scope block.
  const inScopeBlocks = getSelectedTextBlocks(snapshot).filter(
    (block) => getBlockSubSchema(snapshot.context, block.path).lists.length > 0,
  )

  const firstListItem = inScopeBlocks.at(0)?.node.listItem

  if (!firstListItem) {
    return undefined
  }

  if (inScopeBlocks.every((block) => block.node.listItem === firstListItem)) {
    return firstListItem
  }

  return undefined
}
