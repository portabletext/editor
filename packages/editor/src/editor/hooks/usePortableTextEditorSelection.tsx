import {startTransition, useContext, useEffect, useState} from 'react'
import type {EditorSelection} from '../../types/editor'
import {EditorActorContext} from '../editor-actor-context'

/**
 * @deprecated Use `useEditorSelector` to get the current editor selection.
 * @public
 * Get the current editor selection from the React context.
 */
export const usePortableTextEditorSelection = (): EditorSelection => {
  const editorActor = useContext(EditorActorContext)
  const [selection, setSelection] = useState<EditorSelection>(null)

  useEffect(() => {
    const subscription = editorActor.on('selection', (event) => {
      // Set the selection state in a transition, we don't need the state immediately.
      startTransition(() => {
        setSelection(event.selection)
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [editorActor])

  return selection
}
