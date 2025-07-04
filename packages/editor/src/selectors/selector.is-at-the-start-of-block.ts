import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import type {BlockPath} from '../types/paths'
import * as utils from '../utils'
import {isSelectionCollapsed} from './selector.is-selection-collapsed'

/**
 * @public
 */
export function isAtTheStartOfBlock(block: {
  node: PortableTextBlock
  path: BlockPath
}): EditorSelector<boolean> {
  return (snapshot) => {
    if (!snapshot.context.selection || !isSelectionCollapsed(snapshot)) {
      return false
    }

    const blockStartPoint = utils.getBlockStartPoint({
      context: snapshot.context,
      block,
    })

    return utils.isEqualSelectionPoints(
      snapshot.context.selection.focus,
      blockStartPoint,
    )
  }
}
