import type {EditorSelector} from '../editor/editor-selector'
import {isBackward, pointEquals} from '../types/selection'
import * as utils from '../utils'
import {getSelectionEndBlock, getSelectionStartBlock} from './selectors'

/**
 * @public
 */
export const isSelectingEntireBlocks: EditorSelector<boolean> = (snapshot) => {
  if (!snapshot.context.selection) {
    return false
  }

  const startPoint = isBackward(snapshot.context.selection)
    ? snapshot.context.selection.focus
    : snapshot.context.selection.anchor
  const endPoint = isBackward(snapshot.context.selection)
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
    pointEquals(startBlockStartPoint, startPoint) &&
    pointEquals(endBlockEndPoint, endPoint)
  )
}
