import type React from 'react'
import {useCallback, useEffect} from 'react'
import type {Editor} from '../../interfaces/editor'
import {
  EngineSelectorContext,
  useSelectorContext,
} from '../hooks/use-engine-selector'
import {EditorContext} from '../hooks/use-engine-static'

/**
 * A wrapper around the provider to handle `onChange` events, because the editor
 * is a mutable singleton so it won't ever register as "changed" otherwise.
 */

export const Engine = (props: {editor: Editor; children: React.ReactNode}) => {
  const {editor, children} = props

  const {selectorContext, onChange: handleSelectorChange} = useSelectorContext()

  const onContextChange = useCallback(() => {
    // Consume the channel flags armed where the corresponding state
    // mutated, so channel-scoped selectors only run when their inputs
    // could have changed.
    const pending = editor.selectorChannelsPending
    const registrations = pending.registrations
    const listIndex = pending.listIndex
    pending.registrations = false
    pending.listIndex = false
    handleSelectorChange({registrations, listIndex})
  }, [editor, handleSelectorChange])

  useEffect(() => {
    editor.onContextChange = onContextChange

    return () => {
      editor.onContextChange = () => {}
    }
  }, [editor, onContextChange])

  return (
    <EngineSelectorContext.Provider value={selectorContext}>
      <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
    </EngineSelectorContext.Provider>
  )
}
