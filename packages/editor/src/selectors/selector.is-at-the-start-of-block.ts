import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import * as utils from '../utils'
import {isSelectionCollapsed} from './selector.is-selection-collapsed'

/**
 * @public
 */
export function isAtTheStartOfBlock(block: {
  node: PortableTextBlock
  path: [KeyedSegment]
}): EditorSelector<boolean> {
  return ({context}) => {
    if (!context.selection || !isSelectionCollapsed({context})) {
      return false
    }

    const blockStartPoint = utils.getBlockStartPoint(block)

    return utils.isEqualSelectionPoints(
      context.selection.focus,
      blockStartPoint,
    )
  }
}
