import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getTopLevelIndex} from '../internal-utils/block-path-utils'
import type {BlockPath} from '../types/paths'
import {getSelectionEndBlock} from './selector.get-selection-end-block'

/**
 * @public
 */
export const getNextBlock: EditorSelector<
  {node: PortableTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  const selectionEndBlock = getSelectionEndBlock(snapshot)

  if (!selectionEndBlock) {
    return undefined
  }

  const blockPath = snapshot.blockIndexMap.get(selectionEndBlock.node._key)
  const topLevelIndex = blockPath ? getTopLevelIndex(blockPath) : undefined

  if (
    topLevelIndex === undefined ||
    topLevelIndex === snapshot.context.value.length - 1
  ) {
    return undefined
  }

  const nextBlock = snapshot.context.value.at(topLevelIndex + 1)

  return nextBlock
    ? {node: nextBlock, path: [{_key: nextBlock._key}]}
    : undefined
}
