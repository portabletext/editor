import type {EditorSelector} from '../editor/editor-selector'
import type {EditorSelection} from '../types/editor'
import {
  blockOffsetToSpanSelectionPoint,
  getBlockEndPoint,
  getBlockStartPoint,
  spanSelectionPointToBlockOffset,
  type BlockOffset,
} from '../utils'
import {getNextInlineObject} from './selector.get-next-inline-object'
import {getPreviousInlineObject} from './selector.get-previous-inline-object'
import {getSelectionStartPoint} from './selector.get-selection-start-point'
import {getSelectionText} from './selector.get-selection-text'
import {isSelectionCollapsed} from './selector.is-selection-collapsed'
import {isSelectionExpanded} from './selector.is-selection-expanded'
import {getFocusTextBlock} from './selectors'

/**
 * @public
 * Returns the selection of the of the word the caret is placed in.
 * Note: Only returns a word selection if the current selection is collapsed
 */
export const getCaretWordSelection: EditorSelector<EditorSelection> = ({
  context,
}) => {
  if (!context.selection) {
    return null
  }

  if (!isSelectionCollapsed({context})) {
    return null
  }

  const focusTextBlock = getFocusTextBlock({context})
  const selectionStartPoint = getSelectionStartPoint({context})
  const selectionStartOffset = selectionStartPoint
    ? spanSelectionPointToBlockOffset({
        value: context.value,
        selectionPoint: selectionStartPoint,
      })
    : undefined

  if (!focusTextBlock || !selectionStartPoint || !selectionStartOffset) {
    return null
  }

  const previousInlineObject = getPreviousInlineObject({context})
  const blockStartPoint = getBlockStartPoint(focusTextBlock)
  const textBefore = getSelectionText({
    context: {
      ...context,
      selection: {
        anchor: previousInlineObject
          ? {path: previousInlineObject.path, offset: 0}
          : blockStartPoint,
        focus: selectionStartPoint,
      },
    },
  })
  const textDirectlyBefore = textBefore.split(/\s+/).at(-1)

  const nextInlineObject = getNextInlineObject({context})
  const blockEndPoint = getBlockEndPoint(focusTextBlock)
  const textAfter = getSelectionText({
    context: {
      ...context,
      selection: {
        anchor: selectionStartPoint,
        focus: nextInlineObject
          ? {path: nextInlineObject.path, offset: 0}
          : blockEndPoint,
      },
    },
  })
  const textDirectlyAfter = textAfter.split(/\s+/).at(0)

  const caretWordStartOffset: BlockOffset = textDirectlyBefore
    ? {
        ...selectionStartOffset,
        offset: selectionStartOffset.offset - textDirectlyBefore.length,
      }
    : selectionStartOffset
  const caretWordEndOffset: BlockOffset = textDirectlyAfter
    ? {
        ...selectionStartOffset,
        offset: selectionStartOffset.offset + textDirectlyAfter.length,
      }
    : selectionStartOffset

  const caretWordStartSelectionPoint = blockOffsetToSpanSelectionPoint({
    value: context.value,
    blockOffset: caretWordStartOffset,
  })
  const caretWordEndSelectionPoint = blockOffsetToSpanSelectionPoint({
    value: context.value,
    blockOffset: caretWordEndOffset,
  })

  if (!caretWordStartSelectionPoint || !caretWordEndSelectionPoint) {
    return null
  }

  const caretWordSelection = {
    anchor: caretWordStartSelectionPoint,
    focus: caretWordEndSelectionPoint,
  }

  return isSelectionExpanded({
    context: {
      ...context,
      selection: caretWordSelection,
    },
  })
    ? caretWordSelection
    : null
}
