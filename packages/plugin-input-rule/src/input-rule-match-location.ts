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
import {blockOffsetToSpanSelectionPoint} from '@portabletext/editor/utils'

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
  focusTextBlock,
  originalTextBefore,
}: {
  match: [string, number, number]
  adjustIndexBy: number
  snapshot: EditorSnapshot
  focusTextBlock: {
    path: BlockPath
  }
  originalTextBefore: string
}): InputRuleMatchLocation | undefined {
  const [text, start, end] = match
  const adjustedIndex = start + adjustIndexBy

  const targetOffsets = {
    anchor: {
      path: focusTextBlock.path,
      offset: adjustedIndex,
    },
    focus: {
      path: focusTextBlock.path,
      offset: adjustedIndex + end - start,
    },
    backward: false,
  }
  const normalizedOffsets = {
    anchor: {
      path: focusTextBlock.path,
      offset: Math.min(targetOffsets.anchor.offset, originalTextBefore.length),
    },
    focus: {
      path: focusTextBlock.path,
      offset: Math.min(targetOffsets.focus.offset, originalTextBefore.length),
    },
    backward: false,
  }

  const anchorBackwards = blockOffsetToSpanSelectionPoint({
    context: snapshot.context,
    blockOffset: normalizedOffsets.anchor,
    direction: 'backward',
  })
  const focusForwards = blockOffsetToSpanSelectionPoint({
    context: snapshot.context,
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

  if (
    inlineObjectsAfterMatch.some((inlineObjectAfter) =>
      inlineObjectsBefore.some(
        (inlineObjectBefore) =>
          inlineObjectAfter.node._key === inlineObjectBefore.node._key,
      ),
    )
  ) {
    return undefined
  }

  return {
    text,
    selection,
    targetOffsets,
  }
}
