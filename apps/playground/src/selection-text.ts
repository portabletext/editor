import type {
  EditorContext,
  EditorSelection,
  PortableTextBlock,
} from '@portabletext/editor'
import {
  getTextBlockText,
  isTextBlock,
  sliceBlocks,
} from '@portabletext/editor/utils'

/**
 * Resolves the text a selection covers, joining multiple blocks with a blank
 * line the way a paste would. Returns `undefined` when the selection no
 * longer resolves against `value` (its block or span was removed), so a
 * caller can treat that as "extraction failed" rather than an empty string.
 */
export function getSelectionText(
  context: Pick<EditorContext, 'schema'>,
  value: Array<PortableTextBlock>,
  selection: EditorSelection,
): string | undefined {
  if (!selection) {
    return undefined
  }

  try {
    const slice = sliceBlocks({
      context: {schema: context.schema, selection},
      blocks: value,
    })

    if (slice.length === 0) {
      return undefined
    }

    return slice
      .filter((block) => isTextBlock({schema: context.schema}, block))
      .map((block) => getTextBlockText(block))
      .join('\n\n')
  } catch {
    return undefined
  }
}
