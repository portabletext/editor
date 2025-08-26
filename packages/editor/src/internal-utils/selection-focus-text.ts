import {isSpan, isTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../selection/selection-point'

export function getSelectionFocusText(
  context: Pick<EditorContext, 'schema' | 'value' | 'selection'>,
) {
  if (!context.selection) {
    return undefined
  }

  const focusBlockKey = getBlockKeyFromSelectionPoint(context.selection.focus)
  const focusChildKey = getChildKeyFromSelectionPoint(context.selection.focus)

  if (focusBlockKey === undefined || focusChildKey === undefined) {
    return undefined
  }

  let text: string | undefined

  for (const block of context.value) {
    if (isTextBlock(context, block)) {
      if (block._key === focusBlockKey) {
        for (const child of block.children) {
          if (isSpan(context, child)) {
            if (child._key === focusChildKey) {
              text = child.text
              break
            }
          }
        }
      }
    }
  }

  return text
}
