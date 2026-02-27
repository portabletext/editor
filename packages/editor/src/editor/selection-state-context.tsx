import {useSelector} from '@xstate/react'
import {createContext, useContext} from 'react'
import {getFocusChild} from '../selectors'
import {getSelectedChildren} from '../selectors/selector.get-selected-children'
import {getSelectionEndPoint} from '../selectors/selector.get-selection-end-point'
import {getSelectionStartPoint} from '../selectors/selector.get-selection-start-point'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {useSlateStatic} from '../slate-react'
import {getBlockKeyFromSelectionPoint} from '../utils/util.selection-point'
import {serializePath} from '../utils/util.serialize-path'
import {EditorActorContext} from './editor-actor-context'
import {getEditorSnapshot} from './editor-selector'

/**
 * Selection state computed once per selection change, shared across all components.
 */
type SelectionState = {
  /**
   * Serialized path of the child (span or inline object) that has the caret
   * (when selection is collapsed). Format: "blockKey.children.childKey".
   * `undefined` if selection is expanded or there is no selection.
   */
  focusedChildPath: string | undefined
  /**
   * Set of serialized child paths (spans and inline objects) that are within
   * the current selection. Format: "blockKey.children.childKey".
   */
  selectedChildPaths: Set<string>
  /**
   * The _key of the block that has the caret (when selection is collapsed).
   * `undefined` if selection is expanded or there is no selection.
   */
  focusedBlockKey: string | undefined
  /**
   * Set of block _keys that are within the current selection.
   */
  selectedBlockKeys: Set<string>
}

const emptySet = new Set<string>()

const defaultSelectionState: SelectionState = {
  focusedChildPath: undefined,
  selectedChildPaths: emptySet,
  focusedBlockKey: undefined,
  selectedBlockKeys: emptySet,
}

export const SelectionStateContext = createContext<SelectionState>(
  defaultSelectionState,
)

/**
 * Computes selection state once per selection change.
 */
export function SelectionStateProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const editorActor = useContext(EditorActorContext)
  const slateEditor = useSlateStatic()

  const selectionState = useSelector(
    editorActor,
    (editorActorSnapshot) => {
      const snapshot = getEditorSnapshot({
        editorActorSnapshot,
        slateEditorInstance: slateEditor,
      })

      if (!snapshot.context.selection) {
        return defaultSelectionState
      }

      const isCollapsed = isSelectionCollapsed(snapshot)

      let focusedChildPath: string | undefined

      if (isCollapsed) {
        const focusChild = getFocusChild(snapshot)
        if (focusChild) {
          focusedChildPath = serializePath(focusChild.path)
        }
      }

      const selectedChildren = getSelectedChildren()(snapshot)
      let selectedChildPaths =
        selectedChildren.length > 0
          ? new Set(selectedChildren.map((child) => serializePath(child.path)))
          : emptySet

      if (
        isCollapsed &&
        focusedChildPath &&
        !selectedChildPaths.has(focusedChildPath)
      ) {
        selectedChildPaths = new Set(selectedChildPaths)
        selectedChildPaths.add(focusedChildPath)
      }

      const startPoint = getSelectionStartPoint(snapshot)
      const endPoint = getSelectionEndPoint(snapshot)
      const startBlockKey = startPoint
        ? getBlockKeyFromSelectionPoint(startPoint)
        : undefined
      const endBlockKey = endPoint
        ? getBlockKeyFromSelectionPoint(endPoint)
        : undefined

      let selectedBlockKeys: Set<string> = emptySet

      if (startBlockKey && endBlockKey) {
        const startBlockIndex = snapshot.blockPathMap.getIndex([startBlockKey])
        const endBlockIndex = snapshot.blockPathMap.getIndex([endBlockKey])

        if (startBlockIndex !== undefined && endBlockIndex !== undefined) {
          const minIndex = Math.min(startBlockIndex, endBlockIndex)
          const maxIndex = Math.max(startBlockIndex, endBlockIndex)
          selectedBlockKeys = new Set<string>()

          for (const [key, path] of snapshot.blockPathMap.entries()) {
            const index = path[0]
            if (index !== undefined && index >= minIndex && index <= maxIndex) {
              selectedBlockKeys.add(key)
            }
          }
        }
      }

      const focusedBlockKey = isCollapsed ? startBlockKey : undefined

      return {
        focusedChildPath,
        selectedChildPaths:
          selectedChildPaths.size > 0 ? selectedChildPaths : emptySet,
        focusedBlockKey,
        selectedBlockKeys:
          selectedBlockKeys.size > 0 ? selectedBlockKeys : emptySet,
      }
    },
    (prev, next) => {
      if (prev.focusedChildPath !== next.focusedChildPath) {
        return false
      }

      if (prev.selectedChildPaths !== next.selectedChildPaths) {
        if (prev.selectedChildPaths.size !== next.selectedChildPaths.size) {
          return false
        }

        for (const path of prev.selectedChildPaths) {
          if (!next.selectedChildPaths.has(path)) {
            return false
          }
        }
      }

      if (prev.focusedBlockKey !== next.focusedBlockKey) {
        return false
      }

      if (prev.selectedBlockKeys !== next.selectedBlockKeys) {
        if (prev.selectedBlockKeys.size !== next.selectedBlockKeys.size) {
          return false
        }

        for (const key of prev.selectedBlockKeys) {
          if (!next.selectedBlockKeys.has(key)) {
            return false
          }
        }
      }

      return true
    },
  )

  return (
    <SelectionStateContext.Provider value={selectionState}>
      {children}
    </SelectionStateContext.Provider>
  )
}
