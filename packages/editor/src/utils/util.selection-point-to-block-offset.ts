import type {EditorSelectionPoint} from '..'
import type {EditorContext} from '../editor/editor-snapshot'
import {getIndexedSelectionPoint} from '../editor/indexed-selection'
import type {BlockOffset} from '../types/block-offset'
import {childSelectionPointToBlockOffset} from './util.child-selection-point-to-block-offset'

/**
 * @public
 */
export function selectionPointToBlockOffset({
  context,
  selectionPoint,
}: {
  context: Pick<EditorContext, 'schema' | 'value'>
  selectionPoint: EditorSelectionPoint
}): BlockOffset | undefined {
  const indexedSelectionPoint = getIndexedSelectionPoint(
    context.schema,
    context.value,
    selectionPoint,
  )

  if (!indexedSelectionPoint) {
    return undefined
  }

  const blockIndex = indexedSelectionPoint.path.at(0)

  if (indexedSelectionPoint.path.length === 1 && blockIndex !== undefined) {
    const block =
      blockIndex !== undefined ? context.value.at(blockIndex) : undefined

    if (!block) {
      return undefined
    }

    return {
      path: [{_key: block._key}],
      offset: selectionPoint.offset,
    }
  }

  return childSelectionPointToBlockOffset({
    context,
    selectionPoint,
  })
}
