import {useContext, useEffect, useState} from 'react'
import {
  createDropPositionBehaviorsConfig,
  type DropPosition,
} from '../behaviors/behavior.core.drop-position'
import {EditorActorContext} from './editor-actor-context'

export function useDropPosition(): DropPosition | undefined {
  const editorActor = useContext(EditorActorContext)
  const [dropPosition, setDropPosition] = useState<DropPosition | undefined>()

  useEffect(() => {
    const behaviorConfigs = createDropPositionBehaviorsConfig({
      setDropPosition,
    })

    for (const behaviorConfig of behaviorConfigs) {
      editorActor.send({
        type: 'add behavior',
        behaviorConfig,
      })
    }

    return () => {
      for (const behaviorConfig of behaviorConfigs) {
        editorActor.send({
          type: 'remove behavior',
          behaviorConfig,
        })
      }
    }
  }, [editorActor, setDropPosition])

  return dropPosition
}
