import {isTextBlock, type PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
import {getFocusTextBlock} from './selector.get-focus-text-block'
import {getMarkState} from './selector.get-mark-state'
import {getSelectedBlocks} from './selector.get-selected-blocks'

/**
 * @public
 */
export const getActiveAnnotations: EditorSelector<Array<PortableTextObject>> = (
  snapshot,
) => {
  if (!snapshot.context.selection) {
    return []
  }

  const selectedBlocks = getSelectedBlocks(snapshot)
  const markState = getMarkState(snapshot)

  const focusTextBlock = getFocusTextBlock(snapshot)
  const decorators = focusTextBlock
    ? getBlockSubSchema(snapshot.context, focusTextBlock.path).decorators
    : snapshot.context.schema.decorators

  const activeAnnotations = (markState?.marks ?? []).filter(
    (mark) => !decorators.map((decorator) => decorator.name).includes(mark),
  )

  const selectionMarkDefs = selectedBlocks.flatMap((block) =>
    isTextBlock(snapshot.context, block.node)
      ? (block.node.markDefs ?? [])
      : [],
  )

  return selectionMarkDefs.filter((markDef) =>
    activeAnnotations.includes(markDef._key),
  )
}
