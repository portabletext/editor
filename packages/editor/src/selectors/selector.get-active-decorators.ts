import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
import {getMarkState} from './selector.get-mark-state'
import {getSelectedTextBlocks} from './selector.get-selected-text-blocks'

export function getActiveDecorators(snapshot: EditorSnapshot) {
  const decoratorState = snapshot.decoratorState
  const markState = getMarkState(snapshot)

  // Union of decorator names across all selected blocks' sub-schemas. At
  // root this is the full schema; inside containers it's the union of
  // each block's sub-schema decorators (so cross-container selections
  // include decorators that any in-scope span allows).
  const selectedBlocks = getSelectedTextBlocks(snapshot)
  const decorators = new Set<string>()
  for (const block of selectedBlocks) {
    for (const decorator of getBlockSubSchema(snapshot.context, block.path)
      .decorators) {
      decorators.add(decorator.name)
    }
  }
  if (decorators.size === 0) {
    for (const decorator of snapshot.context.schema.decorators) {
      decorators.add(decorator.name)
    }
  }

  const markStateDecorators = (markState?.marks ?? []).filter((mark) =>
    decorators.has(mark),
  )

  let activeDecorators: Array<string> = markStateDecorators

  for (const decorator in decoratorState) {
    if (decoratorState[decorator] === false) {
      activeDecorators = activeDecorators.filter(
        (activeDecorator) => activeDecorator !== decorator,
      )
    } else if (decoratorState[decorator] === true) {
      if (!activeDecorators.includes(decorator)) {
        activeDecorators.push(decorator)
      }
    }
  }

  return activeDecorators
}
