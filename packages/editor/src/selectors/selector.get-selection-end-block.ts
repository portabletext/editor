import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getIndexedSelectionPoint} from '../editor/indexed-selection'
import type {KeyedBlockPath} from '../types/paths'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'

/**
 * @public
 */
export const getSelectionEndBlock: EditorSelector<
  | {
      node: PortableTextBlock
      path: KeyedBlockPath
      index: number
    }
  | undefined
> = (snapshot) => {
  const endPoint = getSelectionEndPoint(snapshot.context.selection)

  if (!endPoint) {
    return undefined
  }

  const indexedStartPoint = getIndexedSelectionPoint(
    snapshot.context.schema,
    snapshot.context.value,
    endPoint,
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
