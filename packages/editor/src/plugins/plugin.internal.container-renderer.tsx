import {useContext, useEffect} from 'react'
import {EditorActorContext} from '../editor/editor-actor-context'

export function ContainerRendererPlugin(props: {types: Array<string>}) {
  const editorActor = useContext(EditorActorContext)

  useEffect(() => {
    for (const type of props.types) {
      editorActor.send({type: 'register renderer', rendererType: type})
    }

    return () => {
      for (const type of props.types) {
        editorActor.send({type: 'unregister renderer', rendererType: type})
      }
    }
  }, [editorActor, props.types])

  return null
}
