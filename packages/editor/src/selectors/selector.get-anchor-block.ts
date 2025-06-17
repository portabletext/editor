import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getBlockIndex} from '../internal-selectors/internal-selector.get-block-index'
import {getBlockKeyFromSelectionPoint} from '../selection/selection-point'

/**
 * @public
 */
export const getAnchorBlock: EditorSelector<
  {node: PortableTextBlock; path: [KeyedSegment]} | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const key = getBlockKeyFromSelectionPoint(snapshot.context.selection.anchor)

  if (!key) {
    return undefined
  }

  const index = getBlockIndex(key)(snapshot)

  if (index === undefined) {
    return undefined
  }

  const node = snapshot.context.value.at(index)

  return node ? {node, path: [{_key: key}]} : undefined
}
