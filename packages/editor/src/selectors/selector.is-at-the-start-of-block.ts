import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {BlockPath} from '../types/paths'
import * as utils from '../utils'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

/**
 * @public
 */
export function isAtTheStartOfBlock(block: {
  node: PortableTextBlock
  path: BlockPath
}): EditorSelector<boolean> {
  return (snapshot) => {
    const startPoint = getSelectionStartPoint(snapshot)

    if (!startPoint) {
      return false
    }

    const blockStartPoint = utils.getBlockStartPoint({
      context: snapshot.context,
      block,
    })

    return utils.isEqualSelectionPoints(startPoint, blockStartPoint)
  }
}
