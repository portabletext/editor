import type {EditorSelector} from '../editor/editor-selector'
import {isBackward} from '../types/selection'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {reverseSelection} from '../utils/util.reverse-selection'
import {getSelectionText} from './selector.get-selection-text'

/**
 * @public
 */
export const getBlockTextBefore: EditorSelector<string> = (snapshot) => {
  if (!snapshot.context.selection) {
    return ''
  }

  const selection = isBackward(snapshot.context.selection)
    ? reverseSelection(snapshot.context.selection)
    : snapshot.context.selection

  const point = selection.anchor
  const blockIndex = point.path[0]

  const block =
    blockIndex !== undefined ? snapshot.context.value.at(blockIndex) : undefined

  if (!block || blockIndex === undefined) {
    return ''
  }

  const startOfBlock = getBlockStartPoint({
    context: snapshot.context,
    block: {
      node: block,
      path: [blockIndex],
    },
  })

  return getSelectionText({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: startOfBlock,
        focus: point,
      },
    },
  })
}
