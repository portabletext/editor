import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getMarkState} from './selector.get-mark-state'

export function getActiveAnnotationsMarks(snapshot: EditorSnapshot) {
  const markState = getMarkState(snapshot)
  // A mark is an annotation only when it resolves to one of the block's
  // `markDefs`. "Not a decorator" is not enough: a mark the schema cannot
  // resolve might be a decorator from another schema.
  const focusBlock = getFocusTextBlock(snapshot)
  const markDefKeys = (focusBlock?.node.markDefs ?? []).map(
    (markDef) => markDef._key,
  )

  return (markState?.marks ?? []).filter((mark) => markDefKeys.includes(mark))
}
