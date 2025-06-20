import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
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

  const index = snapshot.blockIndexMap.get(selectionStartBlock.node._key)

  if (index === undefined || index === 0) {
    return undefined
  }

  const previousBlock = snapshot.context.value.at(index - 1)

  return previousBlock
    ? {node: previousBlock, path: [{_key: previousBlock._key}]}
    : undefined
}
