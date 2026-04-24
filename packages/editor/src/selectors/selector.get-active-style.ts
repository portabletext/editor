import type {PortableTextTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getSelectedTextBlocks} from './selector.get-selected-text-blocks'

/**
 * @public
 */
export const getActiveStyle: EditorSelector<PortableTextTextBlock['style']> = (
  snapshot,
) => {
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

  const firstStyle = firstTextBlock.style

  if (!firstStyle) {
    return undefined
  }

  if (selectedTextBlocks.every((block) => block.style === firstStyle)) {
    return firstStyle
  }

  return undefined
}
