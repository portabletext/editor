import {useContext, useEffect} from 'react'
import {EditorActorContext} from '../editor/editor-actor-context'
import type {ContainerConfig} from '../renderers/renderer.types'

/**
 * @internal
 */
export function ContainerPlugin(props: {containers: Array<ContainerConfig>}) {
  const editorActor = useContext(EditorActorContext)

  useEffect(() => {
    for (const containerConfig of props.containers) {
      editorActor.send({
        type: 'register container',
        containerConfig,
      })
    }

    return () => {
      for (const containerConfig of props.containers) {
        editorActor.send({
          type: 'unregister container',
          containerConfig,
        })
      }
    }
  }, [editorActor, props.containers])

  return null
}
