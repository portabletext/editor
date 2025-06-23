import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getBlockKeyFromSelectionPoint} from '../selection/selection-point'
import type {BlockPath} from '../types/paths'

/**
 * @public
 */
export const getAnchorBlock: EditorSelector<
  {node: PortableTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const key = getBlockKeyFromSelectionPoint(snapshot.context.selection.anchor)
  const index = key ? snapshot.blockIndexMap.get(key) : undefined
  const node =
    index !== undefined ? snapshot.context.value.at(index) : undefined

  return node && key ? {node, path: [{_key: key}]} : undefined
}
