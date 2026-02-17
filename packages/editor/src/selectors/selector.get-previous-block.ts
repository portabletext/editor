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

  const entry = snapshot.blockMap.get(selectionStartBlock.node._key)

  if (!entry || entry.prev === null) {
    return undefined
  }

  const prevEntry = snapshot.blockMap.get(entry.prev)
  const prevNode = prevEntry
    ? snapshot.context.value[prevEntry.index]
    : undefined

  return prevNode ? {node: prevNode, path: [{_key: prevNode._key}]} : undefined
}
