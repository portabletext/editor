import type {EditorSelector} from '../editor/editor-selector'
import {getBlockStartPoint} from '../utils/util.get-block-start-point'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {reverseSelection} from '../utils/util.reverse-selection'
import {getSelectionText} from './selector.get-selection-text'

/**
 * @public
 */
export const getBlockTextBefore: EditorSelector<string> = ({context}) => {
  if (!context.selection) {
    return ''
  }

  const selection = context.selection.backward
    ? reverseSelection(context.selection)
    : context.selection
  const point = selection.anchor
  const key = isKeyedSegment(point.path[0]) ? point.path[0]._key : undefined

  const block = key
    ? context.value.find((block) => block._key === key)
    : undefined

  if (!block) {
    return ''
  }

  const startOfBlock = getBlockStartPoint({
    node: block,
    path: [{_key: block._key}],
  })

  return getSelectionText({
    context: {
      ...context,
      value: context.value,
      selection: {
        anchor: startOfBlock,
        focus: point,
      },
    },
  })
}
