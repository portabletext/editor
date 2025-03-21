import type {EditorSnapshot} from '..'
import * as selectors from '../selectors'
import type {EventPosition} from './event-position'

export function draggingOnDragOrigin({
  snapshot,
  position,
}: {
  snapshot: EditorSnapshot
  position: EventPosition
}) {
  const dragOrigin = snapshot.beta.internalDrag?.origin
  return dragOrigin
    ? selectors.isOverlappingSelection(position.selection)({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: dragOrigin.selection,
        },
      })
    : false
}
