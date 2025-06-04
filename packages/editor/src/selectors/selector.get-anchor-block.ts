import type {PortableTextBlock} from '@sanity/types'
import {isIndexedSelection} from '../editor/editor-selection'
import type {EditorSelector} from '../editor/editor-selector'
import {BlockPath} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * @public
 */
export const getAnchorBlock: EditorSelector<
  {node: PortableTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  if (isIndexedSelection(snapshot.context.selection)) {
    const blockIndex = snapshot.context.selection.anchor.path.at(0)
    const node =
      blockIndex !== undefined
        ? snapshot.context.value.at(blockIndex)
        : undefined

    return node && blockIndex !== undefined
      ? {node, path: [blockIndex]}
      : undefined
  }

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
