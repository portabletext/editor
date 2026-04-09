import {useEffect} from 'react'
import type {InternalEditor} from '../editor/create-editor'
import {useEditor} from '../editor/use-editor'
import type {RendererConfig} from '../renderers/renderer.types'

/**
 * @internal
 */
export function RendererPlugin(props: {renderers: Array<RendererConfig>}) {
  const editor = useEditor() as unknown as InternalEditor

  useEffect(() => {
    for (const rendererConfig of props.renderers) {
      editor._internal.editorActor.send({
        type: 'register renderer',
        rendererConfig,
      })
    }

    return () => {
      for (const rendererConfig of props.renderers) {
        editor._internal.editorActor.send({
          type: 'unregister renderer',
          rendererConfig,
        })
      }
    }
  }, [editor, props.renderers])

  return null
}
