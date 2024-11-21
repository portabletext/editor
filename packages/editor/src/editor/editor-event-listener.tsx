import {useEffect} from 'react'
import {useEffectEvent} from 'use-effect-event'
import type {EditorEmittedEvent} from './editor-machine'
import {useEditorContext} from './editor-provider'

/**
 * @alpha
 */
export function EditorEventListener(props: {
  on: (event: EditorEmittedEvent) => void
}) {
  const editor = useEditorContext()
  const on = useEffectEvent(props.on)

  useEffect(() => {
    const subscription = editor.on('*', on)

    return () => {
      subscription.unsubscribe()
    }
  }, [editor, on])

  return null
}
