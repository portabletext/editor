import type {EditorContext} from '../editor/editor-snapshot'
import {isBlock} from '../node-traversal/is-block'
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
  context: Pick<EditorContext, 'schema' | 'value' | 'containers'>
  selectionPoint: EditorSelectionPoint
}): BlockOffset | undefined {
  if (isBlock(context, selectionPoint.path)) {
    return {
      path: selectionPoint.path,
      offset: selectionPoint.offset,
    }
  }

  return childSelectionPointToBlockOffset({
    context,
    selectionPoint,
  })
}
