import {useEffect} from 'react'
import type {InternalEditor} from '../editor/create-editor'
import {useEditor} from '../editor/use-editor'
import type {Container} from '../renderers/renderer.types'

/**
 * @alpha
 */
export function ContainerPlugin(props: {containers: Array<Container>}) {
  const editor = useEditor() as InternalEditor

  useEffect(() => {
    const unregisterContainers = props.containers.map((container) =>
      editor.registerContainer(container),
    )

    return () => {
      unregisterContainers.forEach((unregister) => {
        unregister()
      })
    }
  }, [editor, props.containers])

  return null
}
