import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isKeyedSegment} from '../utils'

/**
 * @public
 */
export const getAnchorBlock: EditorSelector<
  {node: PortableTextBlock; path: [KeyedSegment]} | undefined
> = (snapshot) => {
  const key = snapshot.context.selection
    ? isKeyedSegment(snapshot.context.selection.anchor.path[0])
      ? snapshot.context.selection.anchor.path[0]._key
      : undefined
    : undefined

  const node = key
    ? snapshot.context.value.find((block) => block._key === key)
    : undefined

  return node && key ? {node, path: [{_key: key}]} : undefined
}
