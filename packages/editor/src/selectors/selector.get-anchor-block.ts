import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
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

  const node = key
    ? snapshot.context.value.find((block) => block._key === key)
    : undefined

  return node && key ? {node, path: [{_key: key}]} : undefined
}
