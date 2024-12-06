import type {EditorSnapshot} from '../editor-snapshot'
import {getSelectionText} from './behavior.utils.get-selection-text'
import {getStartPoint} from './behavior.utils.get-start-point'
import {isKeyedSegment} from './behavior.utils.is-keyed-segment'
import {reverseSelection} from './behavior.utils.reverse-selection'

export function getBlockTextBefore({context}: EditorSnapshot) {
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

  const startOfBlock = getStartPoint({node: block, path: [{_key: block._key}]})

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
