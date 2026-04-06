import type React from 'react'
import {useCallback, useEffect} from 'react'
import type {Editor} from '../../interfaces/editor'
import {
  SlateSelectorContext,
  useSelectorContext,
} from '../hooks/use-slate-selector'
import {EditorContext} from '../hooks/use-slate-static'

/**
 * A wrapper around the provider to handle `onChange` events, because the editor
 * is a mutable singleton so it won't ever register as "changed" otherwise.
 */

export const Slate = (props: {editor: Editor; children: React.ReactNode}) => {
  'use no memo'
  const {editor, children} = props

  const {selectorContext, onChange: handleSelectorChange} = useSelectorContext()

  const onContextChange = useCallback(() => {
    handleSelectorChange()
  }, [handleSelectorChange])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- `editor` is a mutable singleton
    editor.onContextChange = onContextChange

    return () => {
      // eslint-disable-next-line react-hooks/immutability -- `editor` is a mutable singleton
      editor.onContextChange = () => {}
    }
  }, [editor, onContextChange])

  return (
    <SlateSelectorContext.Provider value={selectorContext}>
      <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>
    </SlateSelectorContext.Provider>
  )
}
