import type {
  BlockOffset,
  BlockPath,
  EditorSelection,
  EditorSnapshot,
} from '@portabletext/editor'
import {
  getNextInlineObjects,
  getPreviousInlineObjects,
} from '@portabletext/editor/selectors'
import {
  blockOffsetToSpanSelectionPoint,
  childSelectionPointToBlockOffset,
} from '@portabletext/editor/utils'

/**
 * @public
 */
export type InputRuleMatchLocation = {
  /**
   * The matched text
   */
  text: string
  /**
   * Estimated selection of where in the original text the match is located.
   * The selection is estimated since the match is found in the text after
   * insertion.
   */
  selection: NonNullable<EditorSelection>
  /**
   * Block offsets of the match in the text after the insertion
   */
  targetOffsets: {
    anchor: BlockOffset
    focus: BlockOffset
    backward: boolean
  }
}

export function getInputRuleMatchLocation({
  match,
  adjustIndexBy,
  snapshot,
  focusBlock,
  originalTextBefore,
  allowedInlineObjectRanges,
}: {
  match: [string, number, number]
  adjustIndexBy: number
  snapshot: EditorSnapshot
  focusBlock: {
    path: BlockPath
  }
  originalTextBefore: string
  /**
   * Index ranges (in the same text space as `match`) inside which an inline
   * object may sit without invalidating the match. Empty means any inline
   * object inside the match invalidates it.
   */
  allowedInlineObjectRanges: Array<{start: number; end: number}>
}): InputRuleMatchLocation | undefined {
  const [text, start, end] = match
  const adjustedIndex = start + adjustIndexBy

  const targetOffsets = {
    anchor: {
      path: focusBlock.path,
      offset: adjustedIndex,
    },
    focus: {
      path: focusBlock.path,
      offset: adjustedIndex + end - start,
    },
    backward: false,
  }
  const normalizedOffsets = {
    anchor: {
      path: focusBlock.path,
      offset: Math.min(targetOffsets.anchor.offset, originalTextBefore.length),
    },
    focus: {
      path: focusBlock.path,
      offset: Math.min(targetOffsets.focus.offset, originalTextBefore.length),
    },
    backward: false,
  }

  const anchorBackwards = blockOffsetToSpanSelectionPoint({
    snapshot,
    blockOffset: normalizedOffsets.anchor,
    direction: 'backward',
  })
  const focusForwards = blockOffsetToSpanSelectionPoint({
    snapshot,
    blockOffset: normalizedOffsets.focus,
    direction: 'forward',
  })

  if (!anchorBackwards || !focusForwards) {
    return undefined
  }

  const selection = {
    anchor: anchorBackwards,
    focus: focusForwards,
  }

  const inlineObjectsAfterMatch = getNextInlineObjects({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: selection.anchor,
        focus: selection.anchor,
      },
    },
  })
  const inlineObjectsBefore = getPreviousInlineObjects(snapshot)

  const inlineObjectsInMatch = inlineObjectsAfterMatch.filter(
    (inlineObjectAfter) =>
      inlineObjectsBefore.some(
        (inlineObjectBefore) =>
          inlineObjectAfter.node._key === inlineObjectBefore.node._key,
      ),
  )

  for (const inlineObject of inlineObjectsInMatch) {
    const inlineObjectOffset = childSelectionPointToBlockOffset({
      snapshot,
      selectionPoint: {path: inlineObject.path, offset: 0},
    })

    if (!inlineObjectOffset) {
      return undefined
    }

    const allowed = allowedInlineObjectRanges.some(
      (range) =>
        inlineObjectOffset.offset >= range.start + adjustIndexBy &&
        inlineObjectOffset.offset <= range.end + adjustIndexBy,
    )

    if (!allowed) {
      return undefined
    }
  }

  return {
    text,
    selection,
    targetOffsets,
  }
}
