import {useEffect} from 'react'
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

  useEffect(() => {
    const subscription = editor.on('*', props.on)

    return () => {
      subscription.unsubscribe()
    }
  }, [editor, props.on])

  return null
}
