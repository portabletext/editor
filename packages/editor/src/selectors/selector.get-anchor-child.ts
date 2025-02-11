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
> = ({context}) => {
  const anchorBlock = getAnchorTextBlock({context})

  if (!anchorBlock) {
    return undefined
  }

  const key = context.selection
    ? isKeyedSegment(context.selection.anchor.path[2])
      ? context.selection.anchor.path[2]._key
      : undefined
    : undefined

  const node = key
    ? anchorBlock.node.children.find((span) => span._key === key)
    : undefined

  return node && key
    ? {node, path: [...anchorBlock.path, 'children', {_key: key}]}
    : undefined
}
