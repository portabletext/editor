import type {PortableTextObject, PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../slate/interfaces/path'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {getFocusChild} from './selector.get-focus-child'

/**
 * Returns the child containing the selection's start point, resolved at any
 * depth.
 *
 * @public
 */
export const getSelectionStartChild: EditorSelector<
  | {
      node: PortableTextSpan | PortableTextObject
      path: Path
    }
  | undefined
> = (snapshot) => {
  const startPoint = getSelectionStartPoint(snapshot.context.selection)

  if (!startPoint) {
    return undefined
  }

  return getFocusChild({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: startPoint,
        focus: startPoint,
      },
    },
  })
}
