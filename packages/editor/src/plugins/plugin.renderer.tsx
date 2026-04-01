import {useEffect} from 'react'
import type {InternalEditor} from '../editor/create-editor'
import {useEditor} from '../editor/use-editor'
import type {Renderer} from '../renderers/renderer.types'

/**
 * @internal
 */
export function RendererPlugin(props: {renderers: Array<Renderer>}) {
  const editor = useEditor()

  useEffect(() => {
    const unregisterRenderers = props.renderers.map((renderer) =>
      (editor as InternalEditor).registerRenderer({renderer}),
    )

    return () => {
      unregisterRenderers.forEach((unregister) => {
        unregister()
      })
    }
  }, [editor, props.renderers])

  return null
}
