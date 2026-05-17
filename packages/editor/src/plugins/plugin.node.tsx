import {useEffect} from 'react'
import {useEditor} from '../editor/use-editor'
import type {RegistrableNode} from '../renderers/renderer.types'

/**
 * @alpha
 *
 * Plugin component that registers a list of nodes (containers, text
 * blocks, spans, block objects, inline objects) with the editor. Each
 * node is the result of a `defineX` factory.
 *
 * Stabilize the `nodes` array (a module-level constant or `useMemo`)
 * to avoid a full unregister/re-register cycle on every parent
 * render: a new array reference per render triggers the registration
 * effect to re-run.
 */
export function NodePlugin(props: {nodes: Array<RegistrableNode>}) {
  const editor = useEditor()

  useEffect(() => {
    const unregisterNodes = props.nodes.map((node) =>
      editor.registerNode({node}),
    )

    return () => {
      unregisterNodes.forEach((unregister) => {
        unregister()
      })
    }
  }, [editor, props.nodes])

  return null
}
