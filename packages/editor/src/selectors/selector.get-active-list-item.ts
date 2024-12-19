import type {PortableTextListBlock} from '@sanity/types'
import {createGuards} from '../behavior-actions/behavior.guards'
import type {EditorSelector} from '../editor/editor-selector'
import {getSelectedBlocks} from './selectors'

/**
 * @public
 */
export const getActiveListItem: EditorSelector<
  PortableTextListBlock['listItem'] | undefined
> = ({context}) => {
  if (!context.selection) {
    return undefined
  }

  const guards = createGuards(context)
  const selectedBlocks = getSelectedBlocks({context}).map((block) => block.node)
  const selectedTextBlocks = selectedBlocks.filter(guards.isTextBlock)

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
