import type {EditorSelector} from '../editor/editor-selector'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getBlockTextAroundPoint} from './selector.get-block-text-around-point'

/**
 * @public
 */
export const getBlockTextAfter: EditorSelector<string> = (snapshot) => {
  if (!snapshot.context.selection) {
    return ''
  }

  return getBlockTextAroundPoint(
    snapshot,
    getSelectionEndPoint(snapshot.context.selection),
    'end',
  )
}
