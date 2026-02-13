import type {PortableTextBlock} from '@portabletext/schema'
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

  const entry = snapshot.blockIndexMap.get(selectionEndBlock.node._key)

  if (
    entry === undefined ||
    entry.index === snapshot.context.value.length - 1
  ) {
    return undefined
  }

  const nextBlock = snapshot.context.value.at(entry.index + 1)

  if (!nextBlock) {
    return undefined
  }

  const nextEntry = snapshot.blockIndexMap.get(nextBlock._key)

  return nextEntry ? {node: nextBlock, path: nextEntry.path} : undefined
}
