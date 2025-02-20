import type {EditorSelector} from '../editor/editor-selector'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {reverseSelection} from '../utils/util.reverse-selection'
import {getSelectionText} from './selector.get-selection-text'

/**
 * @public
 */
export const getBlockTextBefore: EditorSelector<string> = (snapshot) => {
  if (!snapshot.context.selection) {
    return ''
  }

  const selection = snapshot.context.selection.backward
    ? reverseSelection(snapshot.context.selection)
    : snapshot.context.selection
  const point = selection.anchor
  const key = isKeyedSegment(point.path[0]) ? point.path[0]._key : undefined

  const block = key
    ? snapshot.context.value.find((block) => block._key === key)
    : undefined

  if (!block) {
    return ''
  }

  const startOfBlock = getBlockStartPoint({
    node: block,
    path: [{_key: block._key}],
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
