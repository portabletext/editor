import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {sliceBlocks} from '../utils/util.slice-blocks'

/**
 * Finds the deepest block key in a selection point path that exists in the blockIndexMap
 * @public
 */
export function getDeepestBlockKey(
  path: Array<any>,
  blockIndexMap: Map<string, Array<number>>,
): string | undefined {
  // Traverse the path backwards to find the deepest block
  for (let i = path.length - 1; i >= 0; i--) {
    const segment = path[i]
    if (isKeyedSegment(segment)) {
      const blockPath = blockIndexMap.get(segment._key)
      if (blockPath !== undefined) {
        return segment._key
      }
    }
  }
  return undefined
}

/**
 * @public
 */
export const getSelectedValue: EditorSelector<Array<PortableTextBlock>> = (
  snapshot,
) => {
  const selection = snapshot.context.selection

  if (!selection) {
    return []
  }

  const startPoint = getSelectionStartPoint(selection)
  const endPoint = getSelectionEndPoint(selection)

  // Find the deepest block keys in the selection paths
  const startBlockKey = getDeepestBlockKey(
    startPoint.path,
    snapshot.blockIndexMap,
  )
  const endBlockKey = getDeepestBlockKey(endPoint.path, snapshot.blockIndexMap)

  if (!startBlockKey || !endBlockKey) {
    return []
  }

  const startBlockPath = snapshot.blockIndexMap.get(startBlockKey)
  const endBlockPath = snapshot.blockIndexMap.get(endBlockKey)

  if (startBlockPath === undefined || endBlockPath === undefined) {
    return []
  }

  const startTopLevelIndex = startBlockPath[0]
  const endTopLevelIndex = endBlockPath[0]

  const startBlock = snapshot.context.value.at(startTopLevelIndex)
  const slicedStartBlock = startBlock
    ? sliceBlocks({
        context: snapshot.context,
        blocks: [startBlock],
      }).at(0)
    : undefined

  if (startTopLevelIndex === endTopLevelIndex) {
    return slicedStartBlock ? [slicedStartBlock] : []
  }

  const endBlock = snapshot.context.value.at(endTopLevelIndex)
  const slicedEndBlock = endBlock
    ? sliceBlocks({
        context: snapshot.context,
        blocks: [endBlock],
      }).at(0)
    : undefined

  const middleBlocks = snapshot.context.value.slice(
    startTopLevelIndex + 1,
    endTopLevelIndex,
  )

  return [
    ...(slicedStartBlock ? [slicedStartBlock] : []),
    ...middleBlocks,
    ...(slicedEndBlock ? [slicedEndBlock] : []),
  ]
}
