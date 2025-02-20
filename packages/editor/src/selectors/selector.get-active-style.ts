import type {PortableTextTextBlock} from '@sanity/types'
import {createGuards} from '../behavior-actions/behavior.guards'
import type {EditorSelector} from '../editor/editor-selector'
import {getSelectedBlocks} from './selectors'

/**
 * @public
 */
export const getActiveStyle: EditorSelector<PortableTextTextBlock['style']> = (
  snapshot,
) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const guards = createGuards(snapshot.context)
  const selectedBlocks = getSelectedBlocks(snapshot).map((block) => block.node)
  const selectedTextBlocks = selectedBlocks.filter(guards.isTextBlock)

  const firstTextBlock = selectedTextBlocks.at(0)

  if (!firstTextBlock) {
    return undefined
  }

  const firstStyle = firstTextBlock.style

  if (!firstStyle) {
    return undefined
  }

  if (selectedTextBlocks.every((block) => block.style === firstStyle)) {
    return firstStyle
  }

  return undefined
}
