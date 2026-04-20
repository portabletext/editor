import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../slate/interfaces/path'
import {isSpanNode} from '../slate/node/is-span-node'
import {getFocusChild} from './selector.get-focus-child'

/**
 * Returns the inline object containing the focus selection, resolved at any
 * depth.
 *
 * @public
 */
export const getFocusInlineObject: EditorSelector<
  {node: PortableTextObject; path: Path} | undefined
> = (snapshot) => {
  const focusChild = getFocusChild(snapshot)

  return focusChild && !isSpanNode(snapshot.context, focusChild.node)
    ? {node: focusChild.node, path: focusChild.path}
    : undefined
}
