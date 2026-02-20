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

  const entry = snapshot.blockMap.get(selectionEndBlock.node._key)

  if (!entry || entry.next === null) {
    return undefined
  }

  const nextEntry = snapshot.blockMap.get(entry.next)
  const nextNode = nextEntry
    ? snapshot.context.value[nextEntry.index]
    : undefined

  return nextNode ? {node: nextNode, path: [{_key: nextNode._key}]} : undefined
}
