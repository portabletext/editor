import {isSpan, type PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../engine/interfaces/path'
import {getSibling} from '../traversal/get-sibling'
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

  return getSibling(snapshot, point.path, {
    direction: 'previous',
    match: (node): node is PortableTextSpan => isSpan(snapshot.context, node),
  })
}
