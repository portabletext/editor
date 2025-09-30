import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import type {BlockPath} from '../types/paths'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {isEqualSelectionPoints} from '../utils/util.is-equal-selection-points'
import {isSelectionCollapsed} from './selector.is-selection-collapsed'

/**
 * @public
 */
export function isAtTheEndOfBlock(block: {
  node: PortableTextBlock
  path: BlockPath
}): EditorSelector<boolean> {
  return (snapshot) => {
    if (!snapshot.context.selection || !isSelectionCollapsed(snapshot)) {
      return false
    }

    const blockEndPoint = getBlockEndPoint({
      context: snapshot.context,
      block,
    })

    return isEqualSelectionPoints(
      snapshot.context.selection.focus,
      blockEndPoint,
    )
  }
}
