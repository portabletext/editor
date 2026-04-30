import type {EditorSelector} from '../editor/editor-selector'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {getBlockTextAroundPoint} from './selector.get-block-text-around-point'

/**
 * @public
 */
export const getBlockTextBefore: EditorSelector<string> = (snapshot) => {
  if (!snapshot.context.selection) {
    return ''
  }

  return getBlockTextAroundPoint(
    snapshot,
    getSelectionStartPoint(snapshot.context.selection),
    'start',
  )
}
