import type {KeyedSegment} from '@portabletext/patches'
import type {PortableTextObject, PortableTextSpan} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isKeyedSegment} from '../utils'
import {getAnchorTextBlock} from './selector.get-anchor-text-block'

/**
 * @public
 */
export const getAnchorChild: EditorSelector<
  | {
      node: PortableTextObject | PortableTextSpan
      path: [KeyedSegment, 'children', KeyedSegment]
    }
  | undefined
> = (snapshot) => {
  const anchorBlock = getAnchorTextBlock(snapshot)

  if (!anchorBlock) {
    return undefined
  }

  const key = snapshot.context.selection
    ? isKeyedSegment(snapshot.context.selection.anchor.path[2])
      ? snapshot.context.selection.anchor.path[2]._key
      : undefined
    : undefined

  const node = key
    ? anchorBlock.node.children.find((span) => span._key === key)
    : undefined

  return node && key
    ? {node, path: [...anchorBlock.path, 'children', {_key: key}]}
    : undefined
}
