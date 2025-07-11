import type {PortableTextObject, PortableTextSpan} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import type {ChildPath} from '../types/paths'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getFocusChild} from './selector.get-focus-child'

/**
 * @public
 */
export const getSelectionEndChild: EditorSelector<
  | {
      node: PortableTextSpan | PortableTextObject
      path: ChildPath
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
