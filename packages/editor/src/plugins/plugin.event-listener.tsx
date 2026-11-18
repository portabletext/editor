import {useEffect} from 'react'
import type {EditorEmittedEvent} from '../editor/relay'
import {useEditor} from '../editor/use-editor'

/**
 * @public
 * Listen for events emitted by the editor. Must be used inside `EditorProvider`. Events available include:
 *  - 'blurred'
 *  - 'change'
 *  - 'editable'
 *  - 'focused'
 *  - 'operation'
 *  - 'read only'
 *  - 'ready'
 *  - 'selection'
 *
 * @example
 * Listen and log events.
 * ```tsx
 * import {defineSchema, EditorProvider} from '@portabletext/editor'
 * import {EventListenerPlugin} from '@portabletext/editor/plugins'
 *
 * const schemaDefinition = defineSchema({})
 *
 * function MyComponent() {
 *  return (
 *  <EditorProvider initialConfig={{schemaDefinition}}>
 *   <EventListenerPlugin
 *    on={(event) => {
 *     console.log(event)
 *    }
 *   } />
 * </EditorProvider>
 *  )
 * }
 * ```
 * @example
 * Handle local content changes.
 * ```tsx continue
 * <EventListenerPlugin
 *  on={(event) => {
 *    if (event.type === 'change' && event.origin === 'local') {
 *      console.log('Patches emitted:', event.patches)
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

  useEffect(() => {
    const subscription = editor.on('*', props.on)

    return () => {
      subscription.unsubscribe()
    }
  }, [editor, props.on])

  return null
}
