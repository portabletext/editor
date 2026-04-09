import type {Patch} from '@portabletext/patches'
import {useEffect} from 'react'
import {useEditor} from '../editor/use-editor'

/**
 * Collects patches emitted by the editor into the provided array.
 * Strips the `origin` field from each patch.
 *
 * @internal
 */
export function PatchesPlugin(props: {patches: Array<Patch>}) {
  const editor = useEditor()

  useEffect(() => {
    const subscription = editor.on('patch', (event) => {
      const {origin: _, ...patch} = event.patch
      props.patches.push(patch)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [editor, props.patches])

  return null
}
