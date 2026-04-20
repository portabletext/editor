import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../slate/interfaces/path'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getFocusBlock} from './selector.get-focus-block'

/**
 * Returns the block containing the selection's end point, resolved at any
 * depth.
 *
 * @public
 */
export const getSelectionEndBlock: EditorSelector<
  | {
      node: PortableTextBlock
      path: Path
    }
  | undefined
> = (snapshot) => {
  const endPoint = getSelectionEndPoint(snapshot.context.selection)

  if (!endPoint) {
    return undefined
  }

  return getFocusBlock({
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
