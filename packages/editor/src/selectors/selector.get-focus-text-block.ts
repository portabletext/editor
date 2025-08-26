import {isTextBlock} from '@portabletext/schema'
import type {PortableTextTextBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import type {BlockPath} from '../types/paths'
import {getFocusBlock} from './selector.get-focus-block'

/**
 * @public
 */
export const getFocusTextBlock: EditorSelector<
  {node: PortableTextTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  const focusBlock = getFocusBlock(snapshot)

  return focusBlock && isTextBlock(snapshot.context, focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}
