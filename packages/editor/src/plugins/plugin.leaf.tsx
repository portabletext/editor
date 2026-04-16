import {useContext, useEffect} from 'react'
import {EditorActorContext} from '../editor/editor-actor-context'
import type {LeafConfig} from '../renderers/renderer.types'

/**
 * @internal
 */
export function LeafPlugin(props: {leaves: Array<LeafConfig>}) {
  const editorActor = useContext(EditorActorContext)

  useEffect(() => {
    const leafConfigs = props.leaves.map((leafConfig) => {
      editorActor.send({type: 'register leaf', leafConfig})
      return leafConfig
    })
    return () => {
      for (const leafConfig of leafConfigs) {
        editorActor.send({type: 'unregister leaf', leafConfig})
      }
    }
  }, [editorActor, props.leaves])

  return null
}
