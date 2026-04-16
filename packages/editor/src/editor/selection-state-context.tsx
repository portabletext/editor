import {useSelector} from '@xstate/react'
import {createContext, useContext} from 'react'
import {isSelectionCollapsed} from '../selectors/selector.is-selection-collapsed'
import {useSlateStatic} from '../slate/react/hooks/use-slate-static'
import {EditorActorContext} from './editor-actor-context'
import {getEditorSnapshot} from './editor-selector'
import {getSelectionState, type SelectionState} from './get-selection-state'

const emptySet = new Set<string>()

const defaultSelectionState: SelectionState = {
  focusedLeafPath: undefined,
  selectedLeafPaths: emptySet,
  focusedContainerPath: undefined,
  selectedContainerPaths: emptySet,
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

      const selection = snapshot.context.selection
        ? {
            anchorPath: snapshot.context.selection.anchor.path,
            focusPath: snapshot.context.selection.focus.path,
            isCollapsed: isSelectionCollapsed(snapshot),
          }
        : null

      return getSelectionState(
        {
          schema: snapshot.context.schema,
          containers: slateEditor.containers,
          value: snapshot.context.value,
          blockIndexMap: slateEditor.blockIndexMap,
        },
        selection,
      )
    },
    (prev, next) => {
      if (prev.focusedLeafPath !== next.focusedLeafPath) {
        return false
      }

      if (prev.focusedContainerPath !== next.focusedContainerPath) {
        return false
      }

      if (prev.selectedLeafPaths !== next.selectedLeafPaths) {
        if (prev.selectedLeafPaths.size !== next.selectedLeafPaths.size) {
          return false
        }

        for (const path of prev.selectedLeafPaths) {
          if (!next.selectedLeafPaths.has(path)) {
            return false
          }
        }
      }

      if (prev.selectedContainerPaths !== next.selectedContainerPaths) {
        if (
          prev.selectedContainerPaths.size !== next.selectedContainerPaths.size
        ) {
          return false
        }

        for (const path of prev.selectedContainerPaths) {
          if (!next.selectedContainerPaths.has(path)) {
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
