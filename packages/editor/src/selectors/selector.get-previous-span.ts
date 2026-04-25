import {isSpan, type PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {findSibling} from '../node-traversal/find-sibling'
import type {Path} from '../slate/interfaces/path'
import {getSelectionStartPoint} from './selector.get-selection-start-point'

/**
 * Returns the span before the selection start within the same text block,
 * resolved at any depth.
 *
 * @public
 */
export const getPreviousSpan: EditorSelector<
  {node: PortableTextSpan; path: Path} | undefined
> = (snapshot) => {
  const point = getSelectionStartPoint(snapshot)

  if (!point) {
    return undefined
  }

  return findSibling(
    snapshot.context,
    point.path,
    'previous',
    (entry): entry is {node: PortableTextSpan; path: Path} =>
      isSpan(snapshot.context, entry.node),
  )
}
