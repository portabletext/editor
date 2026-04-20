import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import type {BlockPath} from '../types/paths'
import {getBlockKeyFromSelectionPoint} from '../utils/util.selection-point'

/**
 * Returns the root-level block containing the focus selection.
 *
 * Root-only: ignores containers. If the focus is inside a nested container
 * (e.g. a code block's line), this returns the outer container block, not
 * the inner block. For container-aware queries, compose the node-traversal
 * utilities directly against `snapshot.context`.
 *
 * @public
 */
export const getFocusBlock: EditorSelector<
  {node: PortableTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const key = getBlockKeyFromSelectionPoint(snapshot.context.selection.focus)
  const index = key ? snapshot.blockIndexMap.get(key) : undefined

  const node =
    index !== undefined ? snapshot.context.value.at(index) : undefined

  return node && key ? {node, path: [{_key: key}]} : undefined
}
