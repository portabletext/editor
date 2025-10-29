import type {EditorSelector} from '../editor/editor-selector'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getFocusBlock} from './selector.get-focus-block'
import {getSelectionText} from './selector.get-selection-text'

/**
 * @public
 */
export const getBlockTextAfter: EditorSelector<string> = (snapshot) => {
  if (!snapshot.context.selection) {
    return ''
  }

  const endPoint = getSelectionEndPoint(snapshot.context.selection)
  const block = getFocusBlock({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: endPoint,
        focus: endPoint,
      },
    },
  })

  if (!block) {
    return ''
  }

  const endOfBlock = getBlockEndPoint({
    context: snapshot.context,
    block,
  })

  return getSelectionText({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: endPoint,
        focus: endOfBlock,
      },
    },
  })
}
