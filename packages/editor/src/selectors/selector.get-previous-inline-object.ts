import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getSibling} from '../traversal/get-sibling'
import {isObject} from '../traversal/is-object'
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

  const sibling = getSibling(snapshot, point.path, {
    direction: 'previous',
    match: (node): node is PortableTextObject => isObject(snapshot, node),
  })

  return sibling
}
