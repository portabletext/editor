import type {EditorSelector} from '../editor/editor-selector'
import * as utils from '../utils'
import {getSelectionEndBlock, getSelectionStartBlock} from './selectors'

/**
 * @public
 */
export const isSelectingEntireBlocks: EditorSelector<boolean> = (snapshot) => {
  if (!snapshot.context.selection) {
    return false
  }

  const startPoint = snapshot.context.selection.backward
    ? snapshot.context.selection.focus
    : snapshot.context.selection.anchor
  const endPoint = snapshot.context.selection.backward
    ? snapshot.context.selection.anchor
    : snapshot.context.selection.focus

  const startBlock = getSelectionStartBlock(snapshot)
  const endBlock = getSelectionEndBlock(snapshot)

  if (!startBlock || !endBlock) {
    return false
  }

  const startBlockStartPoint = utils.getBlockStartPoint(startBlock)
  const endBlockEndPoint = utils.getBlockEndPoint(endBlock)

  return (
    utils.isEqualSelectionPoints(startBlockStartPoint, startPoint) &&
    utils.isEqualSelectionPoints(endBlockEndPoint, endPoint)
  )
}
