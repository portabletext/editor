import {useEffect} from 'react'
import {useEditor} from '../editor/use-editor'
import type {Renderer} from '../renderers/renderer.types'

/**
 * @internal
 */
export function RendererPlugin(props: {
  renderers: Array<{renderer: Renderer}>
}) {
  const editor = useEditor()

  useEffect(() => {
    const unregisterFunctions = props.renderers.map((rendererConfig) =>
      editor.registerRenderer(rendererConfig.renderer),
    )

    return () => {
      for (const unregister of unregisterFunctions) {
        unregister()
      }
    }
  }, [editor, props.renderers])

  return null
}
