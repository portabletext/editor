import type {PortableTextBlock} from '@portabletext/schema'
import {getIndexForKey} from '@sanity/json-match'
import type {EditorSelector} from '../editor/editor-selector'
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

  const index = getIndexForKey(
    snapshot.context.value,
    selectionEndBlock.node._key,
  )

  if (index === undefined) {
    return undefined
  }

  const nextBlock = snapshot.context.value.at(index + 1)

  return nextBlock
    ? {node: nextBlock, path: [{_key: nextBlock._key}]}
    : undefined
}
