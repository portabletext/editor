import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
import {getMarkState} from './selector.get-mark-state'
import {getSelectedTextBlocks} from './selector.get-selected-text-blocks'

/**
 * @public
 */
export const getActiveAnnotations: EditorSelector<Array<PortableTextObject>> = (
  snapshot,
) => {
  if (!snapshot.context.selection) {
    return []
  }

  const selectedBlocks = getSelectedTextBlocks(snapshot)
  const markState = getMarkState(snapshot)

  // Union of decorator names across selected blocks' sub-schemas. Marks
  // that aren't decorators in any in-scope sub-schema are annotations.
  const decoratorNames = new Set<string>()
  for (const block of selectedBlocks) {
    for (const decorator of getBlockSubSchema(snapshot.context, block.path)
      .decorators) {
      decoratorNames.add(decorator.name)
    }
  }
  if (decoratorNames.size === 0) {
    for (const decorator of snapshot.context.schema.decorators) {
      decoratorNames.add(decorator.name)
    }
  }

  const activeAnnotations = (markState?.marks ?? []).filter(
    (mark) => !decoratorNames.has(mark),
  )

  const selectionMarkDefs = selectedBlocks.flatMap(
    (block) => block.node.markDefs ?? [],
  )

  return selectionMarkDefs.filter((markDef) =>
    activeAnnotations.includes(markDef._key),
  )
}
