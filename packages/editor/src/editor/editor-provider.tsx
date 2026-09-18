import type React from 'react'
import {useEffect, useState} from 'react'
import type {EditorConfig} from '../editor'
import {Engine} from '../engine/react/components/engine'
import {stopActor} from '../internal-utils/stop-actor'
import {createInternalEditor} from './create-editor'
import {EditorActorContext} from './editor-actor-context'
import {EditorContext} from './editor-context'
import {PortableTextEditor} from './PortableTextEditor'
import {RangeDecorationsActorContext} from './range-decorations-actor-context'
import {RelayContext} from './relay-context'
import {PortableTextEditorContext} from './usePortableTextEditor'

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
      editable: internalEditor.editable,
      editorActor: internalEditor.actors.editorActor,
    })

    return {internalEditor, portableTextEditor}
  })

  useEffect(() => {
    const unsubscribers: Array<() => void> = []

    // Doesn't need to start before `editorActor`: xstate buffers events
    // sent to an actor before `.start()` and delivers them once it starts.
    internalEditor.actors.rangeDecorationsActor.start()

    for (const subscription of internalEditor.subscriptions) {
      unsubscribers.push(subscription())
    }

    internalEditor.actors.editorActor.start()
    internalEditor.actors.editorActor.send({
      type: 'add editor engine',
      editor: internalEditor.editorEngine,
    })
    internalEditor.relay.start()
    internalEditor.actors.syncActor.start()

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }

      stopActor(internalEditor.actors.editorActor)
      internalEditor.relay.stop()
      stopActor(internalEditor.actors.syncActor)
      stopActor(internalEditor.actors.rangeDecorationsActor)
    }
  }, [internalEditor])

  return (
    <EditorContext.Provider value={internalEditor.editor}>
      <EditorActorContext.Provider value={internalEditor.actors.editorActor}>
        <RangeDecorationsActorContext.Provider
          value={internalEditor.actors.rangeDecorationsActor}
        >
          <RelayContext.Provider value={internalEditor.relay}>
            <Engine editor={internalEditor.editorEngine}>
              <PortableTextEditorContext.Provider value={portableTextEditor}>
                {props.children}
              </PortableTextEditorContext.Provider>
            </Engine>
          </RelayContext.Provider>
        </RangeDecorationsActorContext.Provider>
      </EditorActorContext.Provider>
    </EditorContext.Provider>
  )
}
