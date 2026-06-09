import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {EditorContext} from '../editor/editor-context'
import type {EventPositionBlock} from '../internal-utils/event-position'
import {getDragSelection} from '../selectors/drag-selection'
import {getFocusBlock} from '../selectors/selector.get-focus-block'
import {getSelectedBlocks} from '../selectors/selector.get-selected-blocks'
import {isSelectingEntireBlocks} from '../selectors/selector.is-selecting-entire-blocks'
import type {Path} from '../types/paths'
import {isEqualPaths} from '../utils/util.is-equal-paths'

type DropTarget = {
  path: Path
  position: EventPositionBlock
}

const DropPositionContext = createContext<DropTarget | undefined>(undefined)

/**
 * @internal
 */
export function DropPositionProvider(props: {children: ReactNode}) {
  const editor = useContext(EditorContext)
  const [dropTarget, setDropTarget] = useState<DropTarget | undefined>()

  useEffect(() => {
    if (!editor) {
      return
    }

    const dragoverSubscription = editor.on('drag.dragover', (event) => {
      const snapshot = editor.getSnapshot()

      const dropFocusBlock = getFocusBlock({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: event.position.selection,
        },
      })

      if (!dropFocusBlock) {
        return
      }

      const dragOrigin = event.dragOrigin

      if (!dragOrigin) {
        return
      }

      const dragSelection = getDragSelection({
        eventSelection: dragOrigin.selection,
        snapshot,
      })

      const draggedBlocks = getSelectedBlocks({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: dragSelection,
        },
      })

      if (
        draggedBlocks.some(
          (draggedBlock) => draggedBlock.node._key === dropFocusBlock.node._key,
        )
      ) {
        return
      }

      const draggingEntireBlocks = isSelectingEntireBlocks({
        ...snapshot,
        context: {
          ...snapshot.context,
          selection: dragSelection,
        },
      })

      if (!draggingEntireBlocks) {
        return
      }

      setDropTarget({
        path: dropFocusBlock.path,
        position: event.position.block,
      })
    })

    const reset = () => {
      setDropTarget(undefined)
    }

    const dragendSubscription = editor.on('drag.dragend', reset)
    const dragleaveSubscription = editor.on('drag.dragleave', reset)
    const dropSubscription = editor.on('drag.drop', reset)

    return () => {
      dragoverSubscription.unsubscribe()
      dragendSubscription.unsubscribe()
      dragleaveSubscription.unsubscribe()
      dropSubscription.unsubscribe()
    }
  }, [editor])

  return (
    <DropPositionContext.Provider value={dropTarget}>
      {props.children}
    </DropPositionContext.Provider>
  )
}

/**
 * The drop position relative to a block — `'start'` paints above, `'end'`
 * below, `undefined` when no drop is in progress over this block.
 *
 * @beta
 */
export type DropPosition = 'start' | 'end'

/**
 * Returns the drop position scoped to `path`, or `undefined` when the current
 * drop target is elsewhere or no drop is in progress.
 *
 * Mount inside a `PortableTextEditable` consumer (renderBlock, container render
 * callback, etc.) to paint a drop indicator at the right edge of the block.
 *
 * @beta
 */
export function useDropPosition(path: Path): DropPosition | undefined {
  const dropTarget = useContext(DropPositionContext)

  return useMemo(() => {
    if (!dropTarget) {
      return undefined
    }

    if (!isEqualPaths(dropTarget.path, path)) {
      return undefined
    }

    return dropTarget.position
  }, [dropTarget, path])
}

export {DropIndicator} from '../editor/render.drop-indicator'
