import {useSelector} from '@xstate/react'
import {useCallback, useContext, useEffect, useMemo, useState} from 'react'
import type {
  EventPosition,
  EventPositionBlock,
} from '../internal-utils/event-position'
import {getEnclosingBlock} from '../node-traversal/get-enclosing-block'
import {getSelectedBlocks} from '../selectors/selector.get-selected-blocks'
import {isSelectingEntireBlocks} from '../selectors/selector.is-selecting-entire-blocks'
import type {Path} from '../slate/interfaces/path'
import {pathEquals} from '../slate/path/path-equals'
import {EditorActorContext} from './editor-actor-context'
import {createEditorSnapshot} from './editor-snapshot'

export type DropPosition = {
  path: Path
  position: EventPositionBlock
}

/**
 * Tracks the drop indicator position during an internal drag.
 *
 * Returns:
 * - `dropPosition`: `{path, position}` of the block under the cursor while
 *   dragging, or `undefined` when no drag is in progress / the cursor is
 *   over the dragged selection itself.
 * - `updateDropPosition`: call from a `dragover` handler with the resolved
 *   `EventPosition` for the cursor; updates `dropPosition` accordingly.
 *
 * Per-drag work (computing the dragged-blocks list and the entire-blocks
 * check) runs once when `internalDrag` first becomes defined, captured in
 * a memo keyed on `internalDrag.origin`. Per-event work is one
 * `getEnclosingBlock` for the cursor's block plus a small array `some`.
 *
 * `dropPosition` clears automatically when `internalDrag` becomes
 * undefined (drag end / drop / external dragleave).
 */
export function useDropPosition(): {
  dropPosition: DropPosition | undefined
  updateDropPosition: (eventPosition: EventPosition) => void
} {
  const editorActor = useContext(EditorActorContext)
  const internalDrag = useSelector(
    editorActor,
    (state) => state.context.internalDrag,
  )
  const [dropPosition, setDropPosition] = useState<DropPosition | undefined>()

  const dragDerived = useMemo(() => {
    if (!internalDrag) {
      return undefined
    }

    const slateEditor = editorActor.getSnapshot().context.slateEditor
    if (!slateEditor) {
      return undefined
    }

    const baseSnapshot = createEditorSnapshot({
      converters: editorActor.getSnapshot().context.converters,
      editor: slateEditor,
      keyGenerator: editorActor.getSnapshot().context.keyGenerator,
      readOnly: false,
      schema: editorActor.getSnapshot().context.schema,
    })
    const dragSnapshot = {
      ...baseSnapshot,
      context: {
        ...baseSnapshot.context,
        selection: internalDrag.origin.selection,
      },
    }

    return {
      draggedBlocks: getSelectedBlocks(dragSnapshot),
      draggingEntireBlocks: isSelectingEntireBlocks(dragSnapshot),
    }
  }, [editorActor, internalDrag])

  // Clear the local dropPosition state when the drag ends.
  useEffect(() => {
    if (!internalDrag) {
      return
    }
    return () => {
      setDropPosition(undefined)
    }
  }, [internalDrag])

  const updateDropPosition = useCallback(
    (eventPosition: EventPosition) => {
      if (!dragDerived || !dragDerived.draggingEntireBlocks) {
        return
      }

      const slateEditor = editorActor.getSnapshot().context.slateEditor
      if (!slateEditor) {
        return
      }

      const snapshot = editorActor.getSnapshot()
      const focusSnapshot = createEditorSnapshot({
        converters: snapshot.context.converters,
        editor: slateEditor,
        keyGenerator: snapshot.context.keyGenerator,
        readOnly: false,
        schema: snapshot.context.schema,
      })
      const positionSnapshot = {
        ...focusSnapshot,
        context: {
          ...focusSnapshot.context,
          selection: eventPosition.selection,
        },
      }

      const dropFocusBlock = getEnclosingBlock(
        positionSnapshot,
        eventPosition.selection.focus.path,
      )
      if (!dropFocusBlock) {
        return
      }

      if (
        dragDerived.draggedBlocks.some((block) =>
          pathEquals(block.path, dropFocusBlock.path),
        )
      ) {
        return
      }

      setDropPosition({
        path: dropFocusBlock.path,
        position: eventPosition.block,
      })
    },
    [editorActor, dragDerived],
  )

  return {dropPosition, updateDropPosition}
}
