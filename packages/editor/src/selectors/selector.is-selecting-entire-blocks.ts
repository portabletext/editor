import type {EditorSelector} from '../editor/editor-selector'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isEqualSelectionPoints} from '../utils/util.is-equal-selection-points'
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

  const startBlockStartPoint = getBlockStartPoint({
    context: snapshot.context,
    block: startBlock,
  })
  const endBlockEndPoint = getBlockEndPoint({
    context: snapshot.context,
    block: endBlock,
  })

  return (
    isEqualSelectionPoints(startBlockStartPoint, startPoint) &&
    isEqualSelectionPoints(endBlockEndPoint, endPoint)
  )
}
