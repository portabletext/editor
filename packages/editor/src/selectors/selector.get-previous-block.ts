import type {PortableTextBlock} from '@portabletext/schema'
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

  const entry = snapshot.blockIndexMap.get(selectionStartBlock.node._key)

  if (entry === undefined || entry.index === 0) {
    return undefined
  }

  const previousBlock = snapshot.context.value.at(entry.index - 1)

  if (!previousBlock) {
    return undefined
  }

  const previousEntry = snapshot.blockIndexMap.get(previousBlock._key)

  return previousEntry
    ? {node: previousBlock, path: previousEntry.path}
    : undefined
}
