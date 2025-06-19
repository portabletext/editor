import type React from 'react'
import {useEffect} from 'react'
import {Slate} from 'slate-react'
import type {EditorConfig} from '../editor'
import {stopActor} from '../internal-utils/stop-actor'
import useConstant from '../internal-utils/use-constant'
import {createInternalEditor} from './create-editor'
import {EditorActorContext} from './editor-actor-context'
import {EditorContext} from './editor-context'
import {PortableTextEditorContext} from './hooks/usePortableTextEditor'
import {
  PortableTextEditor,
  type PortableTextEditorProps,
} from './PortableTextEditor'
import {RelayActorContext} from './relay-actor-context'
import {RouteEventsToChanges} from './route-events-to-changes'

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
  const {internalEditor, portableTextEditor} = useConstant(() => {
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
  }, [internalEditor])

  return (
    <EditorContext.Provider value={internalEditor.editor}>
      <RouteEventsToChanges
        relayActor={internalEditor.actors.relayActor}
        onChange={(change) => {
          portableTextEditor.change$.next(change)
        }}
      />
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
