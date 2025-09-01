import type React from 'react'
import {useEffect, useState} from 'react'
import {Slate} from 'slate-react'
import type {EditorConfig} from '../editor'
import {stopActor} from '../internal-utils/stop-actor'
import {createInternalEditor} from './create-editor'
import {EditorActorContext} from './editor-actor-context'
import {EditorContext} from './editor-context'
import {eventToChange} from './event-to-change'
import {PortableTextEditorContext} from './hooks/usePortableTextEditor'
import {
  PortableTextEditor,
  type PortableTextEditorProps,
} from './PortableTextEditor'
import {RelayActorContext} from './relay-actor-context'

/**
 * @public
 */
export type EditorProviderProps = {
  initialConfig: EditorConfig
  children?: React.ReactNode
}

/**
 * @public
 * The EditorProvider component is used to set up the editor context and configure the Portable Text Editor.
 * @example
 * ```tsx
 * import {EditorProvider} from '@portabletext/editor'
 *
 * function App() {
 *  return (
 *    <EditorProvider initialConfig={{ ... }} >
 *      ...
 *    </EditorProvider>
 *  )
 * }
 *
 * ```
 * @group Components
 */
export function EditorProvider(props: EditorProviderProps) {
  const [{internalEditor, portableTextEditor}] = useState(() => {
    const internalEditor = createInternalEditor(props.initialConfig)
    const portableTextEditor = new PortableTextEditor({
      editor: internalEditor.editor,
    } as unknown as PortableTextEditorProps)

    return {internalEditor, portableTextEditor}
  })

  useEffect(() => {
    const unsubscribers: Array<() => void> = []

    for (const subscription of internalEditor.subscriptions) {
      unsubscribers.push(subscription())
    }

    const relayActorSubscription = internalEditor.actors.relayActor.on(
      '*',
      (event) => {
        const change = eventToChange(event)

        if (change) {
          portableTextEditor.change$.next(change)
        }
      },
    )
    unsubscribers.push(relayActorSubscription.unsubscribe)

    internalEditor.actors.editorActor.start()
    internalEditor.actors.mutationActor.start()
    internalEditor.actors.relayActor.start()
    internalEditor.actors.syncActor.start()

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }

      stopActor(internalEditor.actors.editorActor)
      stopActor(internalEditor.actors.mutationActor)
      stopActor(internalEditor.actors.relayActor)
      stopActor(internalEditor.actors.syncActor)
    }
  }, [internalEditor, portableTextEditor])

  return (
    <EditorContext.Provider value={internalEditor.editor}>
      <EditorActorContext.Provider value={internalEditor.actors.editorActor}>
        <RelayActorContext.Provider value={internalEditor.actors.relayActor}>
          <Slate
            editor={internalEditor.editor._internal.slateEditor.instance}
            initialValue={
              internalEditor.editor._internal.slateEditor.initialValue
            }
          >
            <PortableTextEditorContext.Provider value={portableTextEditor}>
              {props.children}
            </PortableTextEditorContext.Provider>
          </Slate>
        </RelayActorContext.Provider>
      </EditorActorContext.Provider>
    </EditorContext.Provider>
  )
}
