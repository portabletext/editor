import {isTextBlock} from '@portabletext/schema'
import type {PortableTextTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import type {BlockPath} from '../types/paths'
import {getAnchorBlock} from './selector.get-anchor-block'

/**
 * @public
 */
export const getAnchorTextBlock: EditorSelector<
  {node: PortableTextTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  const anchorBlock = getAnchorBlock(snapshot)

  return anchorBlock && isTextBlock(snapshot.context, anchorBlock.node)
    ? {node: anchorBlock.node, path: anchorBlock.path}
    : undefined
}
