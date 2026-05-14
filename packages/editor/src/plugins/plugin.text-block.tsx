import {useEffect} from 'react'
import {useEditor} from '../editor/use-editor'
import type {TextBlock} from '../renderers/renderer.types'

/**
 * @alpha
 */
export function TextBlockPlugin(props: {textBlocks: Array<TextBlock>}) {
  const editor = useEditor()

  useEffect(() => {
    const unregisterTextBlocks = props.textBlocks.map((textBlock) =>
      editor.registerTextBlock(textBlock),
    )

    return () => {
      unregisterTextBlocks.forEach((unregister) => {
        unregister()
      })
    }
  }, [editor, props.textBlocks])

  return null
}
