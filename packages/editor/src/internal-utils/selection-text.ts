import {getTersePt} from '@portabletext/test'
import type {EditorContext} from '../editor/editor-snapshot'
import {sliceBlocks} from '../utils/util.slice-blocks'

export function getSelectionText(
  context: Pick<
    EditorContext,
    'keyGenerator' | 'schema' | 'value' | 'selection'
  >,
) {
  if (!context.selection) {
    return []
  }

  const slice = sliceBlocks({
    context,
    blocks: context.value,
  })

  return getTersePt({schema: context.schema, value: slice})
}
