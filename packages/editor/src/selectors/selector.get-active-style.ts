import type {PortableTextTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {getSelectedBlocks} from './selector.get-selected-blocks'

/**
 * @public
 */
export const getActiveStyle: EditorSelector<PortableTextTextBlock['style']> = (
  snapshot,
) => {
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

  const firstStyle = firstTextBlock.style

  if (!firstStyle) {
    return undefined
  }

  if (selectedTextBlocks.every((block) => block.style === firstStyle)) {
    return firstStyle
  }

  return undefined
}
