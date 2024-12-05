import type {PortableTextListBlock} from '@sanity/types'
import type {EditorSelector} from '../editor-selector'
import {createGuards} from './behavior.guards'
import {getSelectedBlocks} from './behavior.utils'

/**
 * @alpha
 */
export const getActiveListItem: EditorSelector<
  PortableTextListBlock['listItem'] | undefined
> = ({context, state}) => {
  if (!state.selection) {
    return undefined
  }

  const guards = createGuards(context)
  const selectedBlocks = getSelectedBlocks({
    value: state.value,
    selection: state.selection,
  }).map((block) => block.node)
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
