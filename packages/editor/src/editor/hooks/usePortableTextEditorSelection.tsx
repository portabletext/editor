import {createContext, startTransition, useContext, useEffect, useState} from 'react'

import {type EditorChanges, type EditorSelection} from '../../types/editor'
import {debugWithName} from '../../utils/debug'

/**
 * A React context for sharing the editor selection.
 */
const PortableTextEditorSelectionContext = createContext<EditorSelection | null>(null)

/**
 * @public
 * Get the current editor selection from the React context.
 */
export const usePortableTextEditorSelection = (): EditorSelection => {
  const selection = useContext(PortableTextEditorSelectionContext)

  if (selection === undefined) {
    throw new Error(
      `The \`usePortableTextEditorSelection\` hook must be used inside the <PortableTextEditor> component's context.`,
    )
  }
  return selection
}
const debug = debugWithName('component:PortableTextEditor:SelectionProvider')
const debugVerbose = debug.enabled && false

/**
 * @internal
 */
export function PortableTextEditorSelectionProvider(
  props: React.PropsWithChildren<{
    change$: EditorChanges
  }>,
) {
  const {change$} = props
  const [selection, setSelection] = useState<EditorSelection>(null)

  // Subscribe to, and handle changes from the editor
  useEffect(() => {
    debug('Subscribing to selection changes$')
    const subscription = change$.subscribe((next): void => {
      if (next.type === 'selection') {
        // Set the selection state in a transition, we don't need the state immediately.
        startTransition(() => {
          if (debugVerbose) debug('Setting selection')
          setSelection(next.selection)
        })
      }
    })

    return () => {
      debug('Unsubscribing to selection changes$')
      subscription.unsubscribe()
    }
  }, [change$])

  return (
    <PortableTextEditorSelectionContext.Provider value={selection}>
      {props.children}
    </PortableTextEditorSelectionContext.Provider>
  )
}
