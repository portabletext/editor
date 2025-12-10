import {isSpan, type PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {ChildPath} from '../types/paths'
import {getFocusChild} from './selector.get-focus-child'

/**
 * @public
 */
export const getFocusInlineObject: EditorSelector<
  {node: PortableTextObject; path: ChildPath} | undefined
> = (snapshot) => {
  const focusChild = getFocusChild(snapshot)

  return focusChild && !isSpan(snapshot.context, focusChild.node)
    ? {node: focusChild.node, path: focusChild.path}
    : undefined
}
