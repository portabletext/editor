import type {
  KeyedSegment,
  PortableTextObject,
  PortableTextSpan,
} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getChildKeyFromSelectionPoint} from '../selection/selection-point'
import {getFocusTextBlock} from './selector.get-focus-text-block'

/**
 * @public
 */
export const getFocusChild: EditorSelector<
  | {
      node: PortableTextObject | PortableTextSpan
      path: [KeyedSegment, 'children', KeyedSegment]
    }
  | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const focusBlock = getFocusTextBlock(snapshot)

  if (!focusBlock) {
    return undefined
  }

  const key = getChildKeyFromSelectionPoint(snapshot.context.selection.focus)

  const node = key
    ? focusBlock.node.children.find((span) => span._key === key)
    : undefined

  return node && key
    ? {node, path: [...focusBlock.path, 'children', {_key: key}]}
    : undefined
}
