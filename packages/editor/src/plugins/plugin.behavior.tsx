import {useEffect} from 'react'
import type {Behavior} from '../behaviors'
import {useEditor} from '../editor/use-editor'

/**
 * @beta
 */
export function BehaviorPlugin(props: {behaviors: Array<Behavior>}) {
  const editor = useEditor()

  useEffect(() => {
    const unregisterBehaviors = props.behaviors.map((behavior) =>
      editor.registerBehavior({behavior}),
    )

    return () => {
      unregisterBehaviors.forEach((unregister) => unregister())
    }
  }, [editor, props.behaviors])

  return null
}
