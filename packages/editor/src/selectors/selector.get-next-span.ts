import {isSpan, type PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {findSibling} from '../node-traversal/find-sibling'
import type {Path} from '../slate/interfaces/path'
import {getSelectionEndPoint} from './selector.get-selection-end-point'

/**
 * Returns the span after the selection end within the same text block,
 * resolved at any depth.
 *
 * @public
 */
export const getNextSpan: EditorSelector<
  {node: PortableTextSpan; path: Path} | undefined
> = (snapshot) => {
  const point = getSelectionEndPoint(snapshot)

  if (!point) {
    return undefined
  }

  return findSibling(
    snapshot.context,
    point.path,
    'next',
    (entry): entry is {node: PortableTextSpan; path: Path} =>
      isSpan(snapshot.context, entry.node),
  )
}
