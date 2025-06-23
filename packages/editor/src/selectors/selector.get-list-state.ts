import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import type {BlockPath} from '../types/paths'
import {getFocusTextBlock} from './selector.get-focus-text-block'

/**
 * @beta
 * @deprecated Use the precomputed `data-list-index` on text blocks instead.
 * Given the `path` of a block, this selector will return the "list index" of
 * the block.
 */
export function getListIndex({
  path,
}: {
  path: BlockPath
}): EditorSelector<number | undefined> {
  return (snapshot) => {
    const selection = {
      anchor: {
        path,
        offset: 0,
      },
      focus: {
        path,
        offset: 0,
      },
    }

    const focusTextBlock = getFocusTextBlock({
      ...snapshot,
      context: {
        ...snapshot.context,
        selection,
      },
    })

    if (!focusTextBlock) {
      return undefined
    }

    if (
      focusTextBlock.node.listItem === undefined ||
      focusTextBlock.node.level === undefined
    ) {
      return undefined
    }

    const targetListItem = focusTextBlock.node.listItem
    const targetLevel = focusTextBlock.node.level
    const targetKey = focusTextBlock.node._key

    // Find the target block's index
    const targetIndex = snapshot.blockIndexMap.get(targetKey)

    if (targetIndex === undefined) {
      return undefined
    }

    // Walk backwards from the target block and count consecutive list items
    // of the same type and level
    let listIndex = 1 // Start at 1 for the target block itself

    for (let i = targetIndex - 1; i >= 0; i--) {
      const block = snapshot.context.value[i]

      if (!isTextBlock(snapshot.context, block)) {
        // Non-text block breaks the sequence
        break
      }

      if (block.listItem === undefined || block.level === undefined) {
        // Non-list item breaks the sequence
        break
      }

      if (block.listItem !== targetListItem) {
        // Different list type breaks the sequence
        break
      }

      if (block.level < targetLevel) {
        // Lower level breaks the sequence
        break
      }

      if (block.level === targetLevel) {
        // Same level - continue counting
        listIndex++
      }

      // Higher level items don't affect the count for the target level
    }

    return listIndex
  }
}
