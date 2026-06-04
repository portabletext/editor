import {useEffect} from 'react'
import type {Behavior} from '../behaviors/behavior.types.behavior'
import {useEditor} from '../editor/use-editor'

/**
 * @beta
 *
 * Plugin component that registers a list of `Behavior`s with the editor.
 *
 * Stabilize the `behaviors` array (a module-level constant or `useMemo`)
 * to avoid a full unregister/re-register cycle on every parent render: a
 * new array reference per render triggers the registration effect to
 * re-run.
 */
export function BehaviorPlugin(props: {behaviors: Array<Behavior>}) {
  const editor = useEditor()

  useEffect(() => {
    const unregisterBehaviors = props.behaviors.map((behavior) =>
      editor.registerBehavior({behavior}),
    )

    return () => {
      unregisterBehaviors.forEach((unregister) => {
        unregister()
      })
    }
  }, [editor, props.behaviors])

  return null
}
