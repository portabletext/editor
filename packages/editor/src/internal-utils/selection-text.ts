import type {EditorContext} from '../editor/editor-snapshot'
import {sliceBlocks} from '../utils/util.slice-blocks'
import {getTersePt} from './terse-pt'

export function getSelectionText(
  context: Pick<EditorContext, 'schema' | 'value' | 'selection'>,
) {
  if (!context.selection) {
    return []
  }

  const slice = sliceBlocks({
    context: {schema: context.schema, selection: context.selection},
    blocks: context.value,
  })

  return getTersePt({schema: context.schema, value: slice})
}
