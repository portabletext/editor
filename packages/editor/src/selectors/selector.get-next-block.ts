import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getBlockIndex} from '../internal-selectors/internal-selector.get-block-index'
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

  const index = getBlockIndex(selectionEndBlock.node._key)(snapshot)

  if (index === undefined || index === snapshot.context.value.length - 1) {
    return undefined
  }

  const node = snapshot.context.value.at(index + 1)

  return node ? {node, path: [{_key: node._key}]} : undefined
}
