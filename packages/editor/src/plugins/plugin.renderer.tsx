import {useEffect} from 'react'
import {useEditor} from '../editor/use-editor'
import type {RendererBase} from '../renderers/renderer.types'

/**
 * @beta
 * A plugin component for registering custom renderers.
 *
 * @example
 * ```tsx
 * import {RendererPlugin, defineRenderer} from '@portabletext/editor'
 *
 * // Block object renderer (type: 'block', name: 'image')
 * const imageRenderer = defineRenderer<typeof schema>()({
 *   type: 'block',
 *   name: 'image',
 *   render: ({attributes, children, node}) => (
 *     <figure {...attributes}>
 *       <img src={node.src} alt={node.alt} />
 *       {children}
 *     </figure>
 *   ),
 * })
 *
 * function MyEditor() {
 *   return (
 *     <EditorProvider>
 *       <RendererPlugin renderers={[imageRenderer]} />
 *       <PortableTextEditable />
 *     </EditorProvider>
 *   )
 * }
 * ```
 */
export function RendererPlugin(props: {renderers: Array<RendererBase>}) {
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
