import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import * as utils from '../utils'
import {isSelectionCollapsed} from './selector.is-selection-collapsed'

/**
 * @public
 */
export function isAtTheEndOfBlock(block: {
  node: PortableTextBlock
  path: [KeyedSegment]
}): EditorSelector<boolean> {
  return ({context}) => {
    if (!context.selection || !isSelectionCollapsed({context})) {
      return false
    }

    const blockEndPoint = utils.getBlockEndPoint(block)

    return utils.isEqualSelectionPoints(context.selection.focus, blockEndPoint)
  }
}
