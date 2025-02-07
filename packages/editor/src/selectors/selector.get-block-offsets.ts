import type {EditorSelector} from '../editor/editor-selector'
import * as utils from '../utils'
import {getSelectionEndPoint} from './selector.get-selection-end-point'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

/**
 * @public
 */
export const getBlockOffsets: EditorSelector<
  {start: utils.BlockOffset; end: utils.BlockOffset} | undefined
> = ({context}) => {
  if (!context.selection) {
    return undefined
  }

  const selectionStartPoint = getSelectionStartPoint({context})
  const selectionEndPoint = getSelectionEndPoint({context})

  if (!selectionStartPoint || !selectionEndPoint) {
    return undefined
  }

  const start = utils.spanSelectionPointToBlockOffset({
    value: context.value,
    selectionPoint: selectionStartPoint,
  })
  const end = utils.spanSelectionPointToBlockOffset({
    value: context.value,
    selectionPoint: selectionEndPoint,
  })

  return start && end ? {start, end} : undefined
}
