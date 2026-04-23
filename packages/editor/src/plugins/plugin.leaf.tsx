import {useEffect} from 'react'
import type {InternalEditor} from '../editor/create-editor'
import {useEditor} from '../editor/use-editor'
import type {Leaf} from '../renderers/renderer.types'

/**
 * @alpha
 */
export function LeafPlugin(props: {leafs: Array<Leaf>}) {
  const editor = useEditor() as InternalEditor

  useEffect(() => {
    const unregisterLeafs = props.leafs.map((leaf) => editor.registerLeaf(leaf))

    return () => {
      unregisterLeafs.forEach((unregister) => {
        unregister()
      })
    }
  }, [editor, props.leafs])

  return null
}
