import {useSelector} from '@xstate/react'
import {createContext, useContext} from 'react'
import {useSlateStatic} from 'slate-react'
import {getFocusSpan} from '../selectors/selector.get-focus-span'
import {getSelectedChildren} from '../selectors/selector.get-selected-children'
import {getSelectionEndPoint} from '../selectors/selector.get-selection-end-point'
import {getSelectionStartPoint} from '../selectors/selector.get-selection-start-point'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {getBlockKeyFromSelectionPoint} from '../utils/util.selection-point'
import {EditorActorContext} from './editor-actor-context'
import {getEditorSnapshot} from './editor-selector'

/**
 * Selection state computed once per selection change, shared across all components.
 */
type SelectionState = {
  /**
   * The _key of the child (span or inline object) that has the caret (when
   * selection is collapsed). `undefined` if selection is expanded or there is
   * no selection.
   */
  focusedChildKey: string | undefined
  /**
   * Set of child _keys (spans and inline objects) that are within the current
   * selection.
   */
  selectedChildKeys: Set<string>
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
  focusedChildKey: undefined,
  selectedChildKeys: emptySet,
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

      let focusedChildKey: string | undefined

      if (isCollapsed) {
        const focusSpan = getFocusSpan(snapshot)
        focusedChildKey = focusSpan?.node._key
      }

      const selectedChildren = getSelectedChildren()(snapshot)
      let selectedChildKeys =
        selectedChildren.length > 0
          ? new Set(selectedChildren.map((child) => child.node._key))
          : emptySet

      if (
        isCollapsed &&
        focusedChildKey &&
        !selectedChildKeys.has(focusedChildKey)
      ) {
        selectedChildKeys = new Set(selectedChildKeys)
        selectedChildKeys.add(focusedChildKey)
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
        const startBlockIndex = snapshot.blockIndexMap.get(startBlockKey)
        const endBlockIndex = snapshot.blockIndexMap.get(endBlockKey)

        if (startBlockIndex !== undefined && endBlockIndex !== undefined) {
          const minIndex = Math.min(startBlockIndex, endBlockIndex)
          const maxIndex = Math.max(startBlockIndex, endBlockIndex)
          selectedBlockKeys = new Set<string>()

          for (const [key, index] of snapshot.blockIndexMap) {
            if (index >= minIndex && index <= maxIndex) {
              selectedBlockKeys.add(key)
            }
          }
        }
      }

      const focusedBlockKey = isCollapsed ? startBlockKey : undefined

      return {
        focusedChildKey,
        selectedChildKeys:
          selectedChildKeys.size > 0 ? selectedChildKeys : emptySet,
        focusedBlockKey,
        selectedBlockKeys:
          selectedBlockKeys.size > 0 ? selectedBlockKeys : emptySet,
      }
    },
    (prev, next) => {
      if (prev.focusedChildKey !== next.focusedChildKey) {
        return false
      }

      if (prev.selectedChildKeys !== next.selectedChildKeys) {
        if (prev.selectedChildKeys.size !== next.selectedChildKeys.size) {
          return false
        }

        for (const key of prev.selectedChildKeys) {
          if (!next.selectedChildKeys.has(key)) {
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
