import type {EditorSelector} from '../editor/editor-selector'
import type {BlockOffset} from '../types/block-offset'
import * as utils from '../utils'
import {getSelectionEndPoint} from './selector.get-selection-end-point'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

/**
 * @public
 */
export const getBlockOffsets: EditorSelector<
  {start: BlockOffset; end: BlockOffset} | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const selectionStartPoint = getSelectionStartPoint(snapshot)
  const selectionEndPoint = getSelectionEndPoint(snapshot)

  if (!selectionStartPoint || !selectionEndPoint) {
    return undefined
  }

  const start = utils.spanSelectionPointToBlockOffset({
    value: snapshot.context.value,
    selectionPoint: selectionStartPoint,
  })
  const end = utils.spanSelectionPointToBlockOffset({
    value: snapshot.context.value,
    selectionPoint: selectionEndPoint,
  })

  return start && end ? {start, end} : undefined
}
