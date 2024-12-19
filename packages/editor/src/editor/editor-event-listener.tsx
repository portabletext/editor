import {useEffect} from 'react'
import {useEffectEvent} from 'use-effect-event'
import type {EditorEmittedEvent} from './editor-machine'
import {useEditor} from './editor-provider'

/**
 * @public
 */
export function EditorEventListener(props: {
  on: (event: EditorEmittedEvent) => void
}) {
  const editor = useEditor()
  const on = useEffectEvent(props.on)

  useEffect(() => {
    const subscription = editor.on('*', on)

    return () => {
      subscription.unsubscribe()
    }
  }, [editor, on])

  return null
}
