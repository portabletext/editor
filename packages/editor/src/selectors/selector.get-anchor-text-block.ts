import {
  isPortableTextTextBlock,
  type KeyedSegment,
  type PortableTextTextBlock,
} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {getAnchorBlock} from './selector.get-anchor-block'

/**
 * @public
 */
export const getAnchorTextBlock: EditorSelector<
  {node: PortableTextTextBlock; path: [KeyedSegment]} | undefined
> = (snapshot) => {
  const anchorBlock = getAnchorBlock(snapshot)

  return anchorBlock && isPortableTextTextBlock(anchorBlock.node)
    ? {node: anchorBlock.node, path: anchorBlock.path}
    : undefined
}
