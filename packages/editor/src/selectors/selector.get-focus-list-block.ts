import type {PortableTextListBlock} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isListBlock} from '../internal-utils/parse-blocks'
import type {BlockPath} from '../types/paths'
import {getFocusTextBlock} from './selector.get-focus-text-block'

/**
 * @public
 */
export const getFocusListBlock: EditorSelector<
  {node: PortableTextListBlock; path: BlockPath} | undefined
> = (snapshot) => {
  const focusTextBlock = getFocusTextBlock(snapshot)

  return focusTextBlock && isListBlock(snapshot.context, focusTextBlock.node)
    ? {node: focusTextBlock.node, path: focusTextBlock.path}
    : undefined
}
