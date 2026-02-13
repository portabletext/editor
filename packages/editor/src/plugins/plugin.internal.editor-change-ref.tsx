import {useEffect} from 'react'
import {eventToChange} from '../editor/event-to-change'
import {useEditor} from '../editor/use-editor'
import type {EditorChange} from '../types/editor'

export function InternalEditorChangePlugin(props: {
  onChange: (change: EditorChange) => void
}) {
  const editor = useEditor()
  const {onChange} = props

  useEffect(() => {
    const subscription = editor.on('*', (event) => {
      const change = eventToChange(event)

      if (change) {
        onChange(change)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [editor, onChange])

  return null
}
