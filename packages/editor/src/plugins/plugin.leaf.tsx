import {useEffect} from 'react'
import {useEditor} from '../editor/use-editor'
import type {Leaf} from '../renderers/renderer.types'

/**
 * @alpha
 */
export function LeafPlugin(props: {leaves: Array<Leaf>}) {
  const editor = useEditor()

  useEffect(() => {
    const unregisterLeaves = props.leaves.map((leaf) =>
      editor.registerLeaf(leaf),
    )

    return () => {
      unregisterLeaves.forEach((unregister) => {
        unregister()
      })
    }
  }, [editor, props.leaves])

  return null
}
