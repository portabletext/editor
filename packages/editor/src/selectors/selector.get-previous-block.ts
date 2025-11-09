import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getTopLevelIndex} from '../internal-utils/block-path-utils'
import type {BlockPath} from '../types/paths'
import {getSelectionStartBlock} from './selector.get-selection-start-block'

/**
 * @public
 */
export const getPreviousBlock: EditorSelector<
  {node: PortableTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  const selectionStartBlock = getSelectionStartBlock(snapshot)

  if (!selectionStartBlock) {
    return undefined
  }

  const blockPath = snapshot.blockIndexMap.get(selectionStartBlock.node._key)
  const topLevelIndex = blockPath ? getTopLevelIndex(blockPath) : undefined

  if (topLevelIndex === undefined || topLevelIndex === 0) {
    return undefined
  }

  const previousBlock = snapshot.context.value.at(topLevelIndex - 1)

  return previousBlock
    ? {node: previousBlock, path: [{_key: previousBlock._key}]}
    : undefined
}
