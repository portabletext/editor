import type {EditorSelector} from '../editor/editor-selector'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelection} from '../types/editor'
import {
  blockOffsetToSpanSelectionPoint,
  getBlockEndPoint,
  getBlockStartPoint,
  spanSelectionPointToBlockOffset,
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
export const getCaretWordSelection: EditorSelector<EditorSelection> = (
  snapshot,
) => {
  if (!snapshot.context.selection) {
    return null
  }

  if (!isSelectionCollapsed(snapshot)) {
    return null
  }

  const focusTextBlock = getFocusTextBlock(snapshot)
  const selectionStartPoint = getSelectionStartPoint(snapshot)
  const selectionStartOffset = selectionStartPoint
    ? spanSelectionPointToBlockOffset({
        value: snapshot.context.value,
        selectionPoint: selectionStartPoint,
      })
    : undefined

  if (!focusTextBlock || !selectionStartPoint || !selectionStartOffset) {
    return null
  }

  const previousInlineObject = getPreviousInlineObject(snapshot)
  const blockStartPoint = getBlockStartPoint(focusTextBlock)
  const textBefore = getSelectionText({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: previousInlineObject
          ? {path: previousInlineObject.path, offset: 0}
          : blockStartPoint,
        focus: selectionStartPoint,
      },
    },
  })
  const textDirectlyBefore = textBefore.split(/\s+/).at(-1)

  const nextInlineObject = getNextInlineObject(snapshot)
  const blockEndPoint = getBlockEndPoint(focusTextBlock)
  const textAfter = getSelectionText({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: selectionStartPoint,
        focus: nextInlineObject
          ? {path: nextInlineObject.path, offset: 0}
          : blockEndPoint,
      },
    },
  })
  const textDirectlyAfter = textAfter.split(/\s+/).at(0)

  if (
    (textDirectlyBefore === undefined || textDirectlyBefore === '') &&
    (textDirectlyAfter === undefined || textDirectlyAfter === '')
  ) {
    return null
  }

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
    value: snapshot.context.value,
    blockOffset: caretWordStartOffset,
    direction: 'backward',
  })
  const caretWordEndSelectionPoint = blockOffsetToSpanSelectionPoint({
    value: snapshot.context.value,
    blockOffset: caretWordEndOffset,
    direction: 'forward',
  })

  if (!caretWordStartSelectionPoint || !caretWordEndSelectionPoint) {
    return null
  }

  const caretWordSelection = {
    anchor: caretWordStartSelectionPoint,
    focus: caretWordEndSelectionPoint,
  }

  return isSelectionExpanded({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: caretWordSelection,
    },
  })
    ? caretWordSelection
    : null
}
