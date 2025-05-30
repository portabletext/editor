import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import * as utils from '../utils'
import {getSelectionEndPoint} from './selector.get-selection-end-point'

/**
 * @public
 */
export function isAtTheEndOfBlock(block: {
  node: PortableTextBlock
  path: [KeyedSegment]
  index: number
}): EditorSelector<boolean> {
  return (snapshot) => {
    const endPoint = getSelectionEndPoint(snapshot)

    if (!endPoint) {
      return false
    }

    const blockEndPoint = utils.getBlockEndPoint({
      context: snapshot.context,
      block,
    })

    return utils.isEqualSelectionPoints(endPoint, blockEndPoint)
  }
}
