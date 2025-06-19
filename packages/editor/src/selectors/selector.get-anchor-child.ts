import type {PortableTextObject, PortableTextSpan} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getChildKeyFromSelectionPoint} from '../selection/selection-point'
import type {ChildPath} from '../types/paths'
import {getAnchorTextBlock} from './selector.get-anchor-text-block'

/**
 * @public
 */
export const getAnchorChild: EditorSelector<
  | {
      node: PortableTextObject | PortableTextSpan
      path: ChildPath
    }
  | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const anchorBlock = getAnchorTextBlock(snapshot)

  if (!anchorBlock) {
    return undefined
  }

  const key = getChildKeyFromSelectionPoint(snapshot.context.selection.anchor)

  const node = key
    ? anchorBlock.node.children.find((span) => span._key === key)
    : undefined

  return node && key
    ? {node, path: [...anchorBlock.path, 'children', {_key: key}]}
    : undefined
}
