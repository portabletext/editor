import type {PortableTextBlock} from '@sanity/types'
import {getIndexedSelectionPoint} from '../editor/editor-selection'
import type {EditorSelector} from '../editor/editor-selector'
import type {KeyedBlockPath} from '../types/paths'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'

/**
 * @public
 */
export const getSelectionStartBlock: EditorSelector<
  | {
      node: PortableTextBlock
      path: KeyedBlockPath
      index: number
    }
  | undefined
> = (snapshot) => {
  const startPoint = getSelectionStartPoint(snapshot.context.selection)

  if (!startPoint) {
    return undefined
  }

  const indexedStartPoint = getIndexedSelectionPoint(
    snapshot.context.schema,
    snapshot.context.value,
    startPoint,
  )

  const blockIndex = indexedStartPoint?.path.at(0)

  const block =
    blockIndex !== undefined ? snapshot.context.value.at(blockIndex) : undefined

  if (blockIndex === undefined || !block) {
    return undefined
  }

  return {
    node: block,
    path: [{_key: block._key}],
    index: blockIndex,
  }
}
