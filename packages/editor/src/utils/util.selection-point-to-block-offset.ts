import type {EditorContext} from '../editor/editor-snapshot'
import {getBlockKeyFromSelectionPoint} from '../selection/selection-point'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import {childSelectionPointToBlockOffset} from './util.child-selection-point-to-block-offset'

/**
 * @public
 */
export function selectionPointToBlockOffset({
  context,
  selectionPoint,
}: {
  context: Pick<EditorContext, 'schema' | 'value'>
  selectionPoint: EditorSelectionPoint
}): BlockOffset | undefined {
  const blockKey = getBlockKeyFromSelectionPoint(selectionPoint)

  if (selectionPoint.path.length === 1 && blockKey !== undefined) {
    return {
      path: [{_key: blockKey}],
      offset: selectionPoint.offset,
    }
  }

  return childSelectionPointToBlockOffset({
    context,
    selectionPoint,
  })
}
