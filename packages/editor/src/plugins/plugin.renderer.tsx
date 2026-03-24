import {useEffect} from 'react'
import {useEditor} from '../editor/use-editor'
import type {Renderer} from '../renderers/renderer.types'

/**
 * @beta
 */
export function RendererPlugin(props: {renderers: Array<Renderer>}) {
  const editor = useEditor()

  useEffect(() => {
    const unregisterRenderers = props.renderers.map((renderer) =>
      editor.registerRenderer({renderer}),
    )

    return () => {
      unregisterRenderers.forEach((unregister) => {
        unregister()
      })
    }
  }, [editor, props.renderers])

  return null
}
