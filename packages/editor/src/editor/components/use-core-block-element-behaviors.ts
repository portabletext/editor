import {useContext, useEffect} from 'react'
import {createCoreBlockElementBehaviorsConfig} from '../../behaviors/behavior.core.block-element'
import type {EventPositionBlock} from '../../internal-utils/event-position'
import {EditorActorContext} from '../editor-actor-context'

export function useCoreBlockElementBehaviors({
  key,
  onSetDragPositionBlock,
}: {
  key: string
  onSetDragPositionBlock: (
    eventPositionBlock: EventPositionBlock | undefined,
  ) => void
}) {
  const editorActor = useContext(EditorActorContext)

  useEffect(() => {
    const behaviorConfigs = createCoreBlockElementBehaviorsConfig({
      key,
      onSetDragPositionBlock,
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
  }, [editorActor, key, onSetDragPositionBlock])
}
