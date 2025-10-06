import type {
  BlockOffset,
  BlockPath,
  EditorSelection,
  EditorSnapshot,
} from '@portabletext/editor'
import {blockOffsetsToSelection} from '@portabletext/editor/utils'

export type InputRuleMatchLocation = {
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
  match: [number, number]
  adjustIndexBy: number
  snapshot: EditorSnapshot
  focusTextBlock: {
    path: BlockPath
  }
  originalTextBefore: string
}): InputRuleMatchLocation | undefined {
  const [start, end] = match
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
  const selection = blockOffsetsToSelection({
    context: snapshot.context,
    offsets: normalizedOffsets,
    backward: false,
  })

  if (!selection) {
    return undefined
  }

  return {
    selection,
    targetOffsets,
  }
}
