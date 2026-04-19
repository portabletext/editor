import {useEffect} from 'react'
import type {InternalEditor} from '../editor/create-editor'
import {useEditor} from '../editor/use-editor'
import type {Container} from '../renderers/renderer.types'

/**
 * @internal
 */
export function ContainerPlugin(props: {
  containers: Array<{container: Container}>
}) {
  const editor = useEditor() as InternalEditor

  useEffect(() => {
    const unregisters = props.containers.map((config) =>
      editor.registerContainer(config),
    )

    return () => {
      for (const unregister of unregisters) {
        unregister()
      }
    }
  }, [editor, props.containers])

  return null
}
