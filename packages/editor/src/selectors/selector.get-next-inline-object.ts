import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {findSibling} from '../node-traversal/find-sibling'
import {isObjectNode} from '../slate/node/is-object-node'
import type {ChildPath} from '../types/paths'
import {getSelectionEndPoint} from './selector.get-selection-end-point'

/**
 * Returns the inline object after the selection end within the same text
 * block, resolved at any depth.
 *
 * @public
 */
export const getNextInlineObject: EditorSelector<
  {node: PortableTextObject; path: ChildPath} | undefined
> = (snapshot) => {
  const point = getSelectionEndPoint(snapshot)

  if (!point) {
    return undefined
  }

  const sibling = findSibling(
    snapshot.context,
    point.path,
    'next',
    (entry): entry is {node: PortableTextObject; path: ChildPath} =>
      isObjectNode({schema: snapshot.context.schema}, entry.node),
  )

  return sibling
}
