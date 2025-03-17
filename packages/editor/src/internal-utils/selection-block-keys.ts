import type {EditorSelection} from '../types/editor'
import {isKeyedSegment} from '../utils'

export function getSelectionBlockKeys(selection: EditorSelection) {
  if (!selection) {
    return undefined
  }

  if (
    !isKeyedSegment(selection.anchor.path[0]) ||
    !isKeyedSegment(selection.focus.path[0])
  ) {
    return undefined
  }

  return {
    anchor: selection.anchor.path[0]._key,
    focus: selection.focus.path[0]._key,
  }
}
