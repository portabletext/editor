import type {EditorSelector} from '../editor/editor-selector'
import * as selectors from '../selectors'
import * as utils from '../utils'

/**
 * @public
 */
export const isSelectingEntireBlocks: EditorSelector<boolean> = (snapshot) => {
  const startPoint = selectors.getSelectionStartPoint(snapshot)
  const startBlock = selectors.getSelectionStartBlock(snapshot)
  const endPoint = selectors.getSelectionEndPoint(snapshot)
  const endBlock = selectors.getSelectionEndBlock(snapshot)

  if (!startPoint || !startBlock || !endPoint || !endBlock) {
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
