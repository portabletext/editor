import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getBlockIndex} from '../internal-selectors/internal-selector.get-block-index'
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

  const index = getBlockIndex(selectionStartBlock.node._key)(snapshot)

  if (index === undefined || index === 0) {
    return undefined
  }

  const node = snapshot.context.value.at(index - 1)

  return node ? {node, path: [{_key: node._key}]} : undefined
}
