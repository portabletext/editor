import type {EditorSelection} from '../types/editor'
import {getBlockKeyFromSelectionPoint} from '../utils/util.selection-point'

export function getSelectionBlockKeys(selection: EditorSelection) {
  if (!selection) {
    return undefined
  }

  const anchorBlockKey = getBlockKeyFromSelectionPoint(selection.anchor)
  const focusBlockKey = getBlockKeyFromSelectionPoint(selection.focus)

  if (anchorBlockKey === undefined || focusBlockKey === undefined) {
    return undefined
  }

  return {
    anchor: anchorBlockKey,
    focus: focusBlockKey,
  }
}
