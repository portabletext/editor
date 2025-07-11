import type {PortableTextObject, PortableTextSpan} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import type {ChildPath} from '../types/paths'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {getFocusChild} from './selector.get-focus-child'

/**
 * @public
 */
export const getSelectionStartChild: EditorSelector<
  | {
      node: PortableTextSpan | PortableTextObject
      path: ChildPath
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
