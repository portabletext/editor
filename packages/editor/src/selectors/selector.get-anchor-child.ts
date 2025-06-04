import type {PortableTextObject, PortableTextSpan} from '@sanity/types'
import {isIndexedSelection} from '../editor/editor-selection'
import type {EditorSelector} from '../editor/editor-selector'
import {ChildPath, isIndexedBlockPath} from '../types/paths'
import {isKeyedSegment} from '../utils'
import {getAnchorTextBlock} from './selector.get-anchor-text-block'

/**
 * @public
 */
export const getAnchorChild: EditorSelector<
  | {
      node: PortableTextObject | PortableTextSpan
      path: ChildPath
    }
  | undefined
> = (snapshot) => {
  const anchorBlock = getAnchorTextBlock(snapshot)

  if (!anchorBlock) {
    return undefined
  }

  if (
    isIndexedSelection(snapshot.context.selection) &&
    isIndexedBlockPath(anchorBlock.path)
  ) {
    const childIndex = snapshot.context.selection.anchor.path.at(1)
    const node =
      childIndex !== undefined
        ? anchorBlock.node.children.at(childIndex)
        : undefined

    return node && childIndex !== undefined
      ? {node, path: [...anchorBlock.path, childIndex]}
      : undefined
  }

  const key = snapshot.context.selection
    ? isKeyedSegment(snapshot.context.selection.anchor.path[2])
      ? snapshot.context.selection.anchor.path[2]._key
      : undefined
    : undefined

  const node = key
    ? anchorBlock.node.children.find((child) => child._key === key)
    : undefined

  return node && key
    ? {node, path: [{_key: anchorBlock.node._key}, 'children', {_key: key}]}
    : undefined
}
