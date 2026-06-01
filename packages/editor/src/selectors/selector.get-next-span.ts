import {isSpan, type PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../engine/interfaces/path'
import {getSibling} from '../traversal/get-sibling'
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

  return getSibling(snapshot, point.path, {
    direction: 'next',
    match: (node): node is PortableTextSpan => isSpan(snapshot.context, node),
  })
}
