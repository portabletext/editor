import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import type {BlockPath} from '../types/paths'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isEqualSelectionPoints} from '../utils/util.is-equal-selection-points'
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

    const blockStartPoint = getBlockStartPoint({
      context: snapshot.context,
      block,
    })

    return isEqualSelectionPoints(
      snapshot.context.selection.focus,
      blockStartPoint,
    )
  }
}
