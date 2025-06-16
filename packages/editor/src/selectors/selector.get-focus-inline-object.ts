import {
  isPortableTextSpan,
  type KeyedSegment,
  type PortableTextObject,
} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getFocusChild} from './selector.get-focus-child'

/**
 * @public
 */
export const getFocusInlineObject: EditorSelector<
  | {node: PortableTextObject; path: [KeyedSegment, 'children', KeyedSegment]}
  | undefined
> = (snapshot) => {
  const focusChild = getFocusChild(snapshot)

  return focusChild && !isPortableTextSpan(focusChild.node)
    ? {node: focusChild.node, path: focusChild.path}
    : undefined
}
