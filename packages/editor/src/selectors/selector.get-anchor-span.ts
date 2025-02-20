import type {KeyedSegment} from '@portabletext/patches'
import {isPortableTextSpan, type PortableTextSpan} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getAnchorChild} from './selector.get-anchor-child'

/**
 * @public
 */
export const getAnchorSpan: EditorSelector<
  | {node: PortableTextSpan; path: [KeyedSegment, 'children', KeyedSegment]}
  | undefined
> = (snapshot) => {
  const anchorChild = getAnchorChild(snapshot)

  return anchorChild && isPortableTextSpan(anchorChild.node)
    ? {node: anchorChild.node, path: anchorChild.path}
    : undefined
}
