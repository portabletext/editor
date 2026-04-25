import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {findSibling} from '../node-traversal/find-sibling'
import {isObjectNode} from '../slate/node/is-object-node'
import type {ChildPath} from '../types/paths'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

/**
 * Returns the inline object before the selection start within the same text
 * block, resolved at any depth.
 *
 * @public
 */
export const getPreviousInlineObject: EditorSelector<
  {node: PortableTextObject; path: ChildPath} | undefined
> = (snapshot) => {
  const point = getSelectionStartPoint(snapshot)

  if (!point) {
    return undefined
  }

  const sibling = findSibling(
    snapshot.context,
    point.path,
    'previous',
    (entry): entry is {node: PortableTextObject; path: ChildPath} =>
      isObjectNode({schema: snapshot.context.schema}, entry.node),
  )

  return sibling
}
