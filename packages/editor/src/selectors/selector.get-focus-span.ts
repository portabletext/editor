import type {PortableTextSpan} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isSpan} from '../internal-utils/parse-blocks'
import type {ChildPath} from '../types/paths'
import {getFocusChild} from './selector.get-focus-child'

/**
 * @public
 */
export const getFocusSpan: EditorSelector<
  {node: PortableTextSpan; path: ChildPath} | undefined
> = (snapshot) => {
  const focusChild = getFocusChild(snapshot)

  return focusChild && isSpan(snapshot.context, focusChild.node)
    ? {node: focusChild.node, path: focusChild.path}
    : undefined
}
