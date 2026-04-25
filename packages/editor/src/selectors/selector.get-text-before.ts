import type {EditorSelector} from '../editor/editor-selector'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getSelectionText} from './selector.get-selection-text'

/**
 * @public
 */
export const getBlockTextBefore: EditorSelector<string> = (snapshot) => {
  if (!snapshot.context.selection) {
    return ''
  }

  const startPoint = getSelectionStartPoint(snapshot.context.selection)
  const block = getFocusTextBlock({
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
