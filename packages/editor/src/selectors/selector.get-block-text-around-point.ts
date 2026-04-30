import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {EditorSelectionPoint} from '../types/editor'
import {getBlockEndPoint} from '../utils/util.get-block-end-point'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getSelectionText} from './selector.get-selection-text'

/**
 * Compute the text inside the focused text block, bounded between the given
 * selection point and the block's matching edge. Shared between
 * `getBlockTextBefore` and `getBlockTextAfter`.
 */
export function getBlockTextAroundPoint(
  snapshot: EditorSnapshot,
  point: EditorSelectionPoint,
  edge: 'start' | 'end',
): string {
  const block = getFocusTextBlock({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {anchor: point, focus: point},
    },
  })

  if (!block) {
    return ''
  }

  const blockEdgePoint =
    edge === 'start'
      ? getBlockStartPoint({context: snapshot.context, block})
      : getBlockEndPoint({context: snapshot.context, block})

  return getSelectionText({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: edge === 'start' ? blockEdgePoint : point,
        focus: edge === 'start' ? point : blockEdgePoint,
      },
    },
  })
}
