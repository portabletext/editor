import type {EditorState} from './behavior.types'
import {getSelectionText} from './behavior.utils.get-selection-text'
import {getStartPoint} from './behavior.utils.get-start-point'
import {isKeyedSegment} from './behavior.utils.is-keyed-segment'
import {reverseSelection} from './behavior.utils.reverse-selection'

export function getBlockTextBefore(state: EditorState) {
  const selection = state.selection.backward
    ? reverseSelection(state.selection)
    : state.selection
  const point = selection.anchor
  const key = isKeyedSegment(point.path[0]) ? point.path[0]._key : undefined

  const block = key
    ? state.value.find((block) => block._key === key)
    : undefined

  if (!block) {
    return ''
  }

  const startOfBlock = getStartPoint({node: block, path: [{_key: block._key}]})

  return getSelectionText({
    value: state.value,
    selection: {
      anchor: startOfBlock,
      focus: point,
    },
  })
}
