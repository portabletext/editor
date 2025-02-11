import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isKeyedSegment} from '../utils'

/**
 * @public
 */
export const getAnchorBlock: EditorSelector<
  {node: PortableTextBlock; path: [KeyedSegment]} | undefined
> = ({context}) => {
  const key = context.selection
    ? isKeyedSegment(context.selection.anchor.path[0])
      ? context.selection.anchor.path[0]._key
      : undefined
    : undefined

  const node = key
    ? context.value.find((block) => block._key === key)
    : undefined

  return node && key ? {node, path: [{_key: key}]} : undefined
}
