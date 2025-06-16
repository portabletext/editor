import type {EditorSelector} from '../editor/editor-selector'
import * as utils from '../utils'
import {getSelectionEndBlock} from './selector.get-selection-end-block'
import {getSelectionStartBlock} from './selector.get-selection-start-block'

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

  const startBlockStartPoint = utils.getBlockStartPoint({
    context: snapshot.context,
    block: startBlock,
  })
  const endBlockEndPoint = utils.getBlockEndPoint({
    context: snapshot.context,
    block: endBlock,
  })

  return (
    utils.isEqualSelectionPoints(startBlockStartPoint, startPoint) &&
    utils.isEqualSelectionPoints(endBlockEndPoint, endPoint)
  )
}
