import {useEffect} from 'react'
import {useEffectEvent} from 'use-effect-event'
import type {EditorEmittedEvent} from '../editor/relay-machine'
import {useEditor} from '../editor/use-editor'

/**
 * @public
 * Listen for events emitted by the editor. Must be used inside `EditorProvider`. Events available include:
 *  - 'blurred'
 *  - 'done loading'
 *  - 'editable'
 *  - 'error'
 *  - 'focused'
 *  - 'invalid value'
 *  - 'loading'
 *  - 'mutation'
 *  - 'patch'
 *  - 'read only'
 *  - 'ready'
 *  - 'selection'
 *  - 'value changed'
 *
 * @example
 * Listen and log events.
 * ```tsx
 * import {EditorProvider} from '@portabletext/editor'
 * import {EventListenerPlugin} from '@portabletext/editor/plugins'
 *
 * function MyComponent() {
 *  return (
 *  <EditorProvider>
 *   <EventListenerPlugin
 *    on={(event) => {
 *     console.log(event)
 *    }
 *   } />
 *   { ... }
 * </EditorProvider>
 *  )
 * }
 * ```
 * @example
 * Handle events when there is a mutation.
 * ```tsx
 * <EventListenerPlugin
 *  on={(event) => {
 *    if (event.type === 'mutation') {
 *      console.log('Value changed:', event.snapshot)
 *    }
 *  }}
 * />
 * ```
 * @group Components
 */
export function EventListenerPlugin(props: {
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
