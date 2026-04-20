import type {PortableTextObject, PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../slate/interfaces/path'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getFocusChild} from './selector.get-focus-child'

/**
 * Returns the child containing the selection's end point, resolved at any
 * depth.
 *
 * @public
 */
export const getSelectionEndChild: EditorSelector<
  | {
      node: PortableTextSpan | PortableTextObject
      path: Path
    }
  | undefined
> = (snapshot) => {
  const endPoint = getSelectionEndPoint(snapshot.context.selection)

  if (!endPoint) {
    return undefined
  }

  return getFocusChild({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: endPoint,
        focus: endPoint,
      },
    },
  })
}
