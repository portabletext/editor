import {useContext, useEffect} from 'react'
import {EditorActorContext} from '../editor/editor-actor-context'
import type {Container} from '../renderers/renderer.types'

/**
 * @internal
 */
export function ContainerPlugin(props: {
  containers: Array<{container: Container}>
}) {
  const editorActor = useContext(EditorActorContext)

  useEffect(() => {
    const containerConfigs = props.containers.map((containerConfig) => {
      editorActor.send({
        type: 'register container',
        containerConfig,
      })
      return containerConfig
    })

    return () => {
      for (const containerConfig of containerConfigs) {
        editorActor.send({
          type: 'unregister container',
          containerConfig,
        })
      }
    }
  }, [editorActor, props.containers])

  return null
}
