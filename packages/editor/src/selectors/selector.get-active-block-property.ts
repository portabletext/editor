import type {EditorSnapshot} from '../editor/editor-snapshot'
import {getSelectedTextBlocks} from './selector.get-selected-text-blocks'

/**
 * Return the value of the given block-level property if every selected text
 * block has the same value for it, otherwise `undefined`. Shared between
 * `getActiveStyle` and `getActiveListItem`.
 */
export function getActiveBlockProperty<TKey extends 'style' | 'listItem'>(
  snapshot: EditorSnapshot,
  key: TKey,
): string | undefined {
  if (!snapshot.context.selection) {
    return undefined
  }

  const selectedTextBlocks = getSelectedTextBlocks(snapshot).map(
    (block) => block.node,
  )
  const firstTextBlock = selectedTextBlocks.at(0)

  if (!firstTextBlock) {
    return undefined
  }

  const firstValue = firstTextBlock[key]

  if (!firstValue) {
    return undefined
  }

  if (selectedTextBlocks.every((block) => block[key] === firstValue)) {
    return firstValue
  }

  return undefined
}
