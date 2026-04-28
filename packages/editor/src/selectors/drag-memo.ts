import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {EventPosition} from '../internal-utils/event-position'
import type {BlockPath} from '../types/paths'
import {getDragSelection} from './drag-selection'
import {getSelectedBlocks} from './selector.get-selected-blocks'
import {isSelectingEntireBlocks} from './selector.is-selecting-entire-blocks'

type DragMemo = {
  dragSelection: EventPosition['selection']
  draggedBlocks: Array<{node: PortableTextBlock; path: BlockPath}>
  selectingEntireBlocks: boolean
}

const dragMemoCache = new WeakMap<object, DragMemo>()

/**
 * Memoize per-drag derived values that are stable for the duration of a
 * single drag. The `dragOrigin` object reference is stable across all
 * `drag.dragover` and `drag.drop` events of the same drag, so a WeakMap
 * keyed on it gives us O(1) lookup without leaking entries.
 */
export function getDragMemo(
  snapshot: EditorSnapshot,
  dragOrigin: Pick<EventPosition, 'selection'>,
): DragMemo {
  const cached = dragMemoCache.get(dragOrigin)
  if (cached) {
    return cached
  }

  const dragSelection = getDragSelection({
    eventSelection: dragOrigin.selection,
    snapshot,
  })
  const dragSnapshot = {
    ...snapshot,
    context: {...snapshot.context, selection: dragSelection},
  }
  const draggedBlocks = getSelectedBlocks(dragSnapshot)
  const selectingEntireBlocks = isSelectingEntireBlocks(dragSnapshot)

  const memo: DragMemo = {
    dragSelection,
    draggedBlocks,
    selectingEntireBlocks,
  }
  dragMemoCache.set(dragOrigin, memo)
  return memo
}
