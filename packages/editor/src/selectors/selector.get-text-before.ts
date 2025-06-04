import type {EditorSelector} from '../editor/editor-selector'
import {getSelectionStartPoint} from '../utils'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {getSelectionText} from './selector.get-selection-text'
import {getFocusBlock} from './selectors'

/**
 * @public
 */
export const getBlockTextBefore: EditorSelector<string> = (snapshot) => {
  if (!snapshot.context.selection) {
    return ''
  }

  const startPoint = getSelectionStartPoint(snapshot.context.selection)
  const block = getFocusBlock({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: startPoint,
        focus: startPoint,
      },
    },
  })

  if (!block) {
    return ''
  }

  const startOfBlock = getBlockStartPoint({
    context: snapshot.context,
    block,
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
