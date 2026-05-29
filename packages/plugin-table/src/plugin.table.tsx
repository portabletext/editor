import {useEditor} from '@portabletext/editor'
import {useEffect} from 'react'

/**
 * Skeleton placeholder for the table plugin.
 *
 * This component currently registers no behaviors and renders nothing. It
 * exists so that consumers can wire `<TablePlugin />` into their editor today
 * and pick up real functionality as the package grows.
 *
 * @alpha
 */
export function TablePlugin() {
  const editor = useEditor()

  useEffect(() => {
    // Reserved for behavior registration once the table API takes shape.
    void editor
  }, [editor])

  return null
}
