import {useEffect} from 'react'
import {useEffectEvent} from 'use-effect-event'
import type {EditorEmittedEvent} from './editor-machine'
import {useEditor} from './editor-provider'

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
 * import {EditorEventListener, EditorProvider} from '@portabletext/editor'
 *
 * function MyComponent() {
 *  return (
 *  <EditorProvider>
 *   <EditorEventListener
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
 * <EditorEventListener
 *  on={(event) => {
 *    if (event.type === 'mutation') {
 *      console.log('Value changed:', event.snapshot)
 *    }
 *  }}
 * />
 * ```
 * @group Components
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
