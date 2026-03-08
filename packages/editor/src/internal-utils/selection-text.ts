import {toTextspec} from '@portabletext/textspec'
import type {EditorContext} from '../editor/editor-snapshot'
import {sliceBlocks} from '../utils/util.slice-blocks'

export function getSelectionText(
  context: Pick<
    EditorContext,
    'keyGenerator' | 'schema' | 'value' | 'selection'
  >,
) {
  if (!context.selection) {
    return ''
  }

  const slice = sliceBlocks({
    context,
    blocks: context.value,
  })

  return toTextspec({schema: context.schema, value: slice}, {singleLine: true})
}
