import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
} from 'react'
import {debugWithName} from '../../internal-utils/debug'
import type {EditorSelection} from '../../types/editor'
import type {EditorActor} from '../editor-machine'

/**
 * A React context for sharing the editor selection.
 */
const PortableTextEditorSelectionContext =
  createContext<EditorSelection | null>(null)

/**
 * @deprecated Use `useEditorSelector` to get the current editor selection.
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
    editorActor: EditorActor
  }>,
) {
  const [selection, setSelection] = useState<EditorSelection>(null)

  // Subscribe to, and handle changes from the editor
  useEffect(() => {
    debug('Subscribing to selection changes')
    const subscription = props.editorActor.on('selection', (event) => {
      // Set the selection state in a transition, we don't need the state immediately.
      startTransition(() => {
        if (debugVerbose) debug('Setting selection')
        setSelection(event.selection)
      })
    })

    return () => {
      debug('Unsubscribing to selection changes')
      subscription.unsubscribe()
    }
  }, [props.editorActor])

  return (
    <PortableTextEditorSelectionContext.Provider value={selection}>
      {props.children}
    </PortableTextEditorSelectionContext.Provider>
  )
}
