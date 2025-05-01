import type {KeyedSegment, PortableTextTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {getAnchorBlock} from './selector.get-anchor-block'

/**
 * @public
 */
export const getAnchorTextBlock: EditorSelector<
  {node: PortableTextTextBlock; path: [KeyedSegment]} | undefined
> = (snapshot) => {
  const anchorBlock = getAnchorBlock(snapshot)

  return anchorBlock && isTextBlock(snapshot.context, anchorBlock.node)
    ? {node: anchorBlock.node, path: anchorBlock.path}
    : undefined
}
