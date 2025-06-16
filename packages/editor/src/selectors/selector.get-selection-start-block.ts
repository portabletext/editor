import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import type {BlockPath} from '../types/paths'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {getFocusBlock} from './selector.get-focus-block'

/**
 * @public
 */
export const getSelectionStartBlock: EditorSelector<
  | {
      node: PortableTextBlock
      path: BlockPath
    }
  | undefined
> = (snapshot) => {
  const startPoint = getSelectionStartPoint(snapshot.context.selection)

  if (!startPoint) {
    return undefined
  }

  return getFocusBlock({
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
