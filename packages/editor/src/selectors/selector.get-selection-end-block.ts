import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import type {BlockPath} from '../types/paths'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getFocusBlock} from './selector.get-focus-block'

/**
 * @public
 */
export const getSelectionEndBlock: EditorSelector<
  | {
      node: PortableTextBlock
      path: BlockPath
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
