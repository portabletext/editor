import type {EditorSelector} from '../editor/editor-selector'
import * as utils from '../utils'
import {getSelectionStartPoint} from './selector.get-selection-start-point'
import {getSelectionText} from './selector.get-selection-text'
import {getSelectionStartBlock} from './selectors'

/**
 * @public
 */
export const getBlockTextBefore: EditorSelector<string> = (snapshot) => {
  const startBlock = getSelectionStartBlock(snapshot)
  const startPoint = getSelectionStartPoint(snapshot)

  if (!startBlock || !startPoint) {
    return ''
  }

  const startOfBlock = utils.getBlockStartPoint({
    context: snapshot.context,
    block: startBlock,
  })

  return getSelectionText({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: startOfBlock,
        focus: startPoint,
      },
    },
  })
}
