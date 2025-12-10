import {isSpan, type PortableTextSpan} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {ChildPath} from '../types/paths'
import {getAnchorChild} from './selector.get-anchor-child'

/**
 * @public
 */
export const getAnchorSpan: EditorSelector<
  {node: PortableTextSpan; path: ChildPath} | undefined
> = (snapshot) => {
  const anchorChild = getAnchorChild(snapshot)

  return anchorChild && isSpan(snapshot.context, anchorChild.node)
    ? {node: anchorChild.node, path: anchorChild.path}
    : undefined
}
