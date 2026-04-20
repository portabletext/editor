import {isSpan, type PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {Path} from '../slate/interfaces/path'
import {getAnchorChild} from './selector.get-anchor-child'

/**
 * Returns the span containing the anchor selection, resolved at any depth.
 *
 * @public
 */
export const getAnchorSpan: EditorSelector<
  {node: PortableTextSpan; path: Path} | undefined
> = (snapshot) => {
  const anchorChild = getAnchorChild(snapshot)

  return anchorChild && isSpan(snapshot.context, anchorChild.node)
    ? {node: anchorChild.node, path: anchorChild.path}
    : undefined
}
