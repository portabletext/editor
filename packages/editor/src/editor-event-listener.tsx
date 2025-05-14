import {useEffect} from 'react'
import {useEffectEvent} from 'use-effect-event'
import type {EditorEmittedEvent} from './editor/relay-machine'
import {useEditor} from './editor/use-editor'

/**
 * @public
 * @deprecated
 * This component has been renamed. Use `EventListenerPlugin` instead.
 *
 * ```
 * import {EventListenerPlugin} from '@portabletext/editor/plugins'
 * ```
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
  }, [editor])

  return null
}
