import type {PortableTextObject} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlock} from '../internal-utils/parse-blocks'
import type {BlockPath} from '../types/paths'
import {getFocusBlock} from './selector.get-focus-block'

/**
 * @public
 */
export const getFocusBlockObject: EditorSelector<
  {node: PortableTextObject; path: BlockPath} | undefined
> = (snapshot) => {
  const focusBlock = getFocusBlock(snapshot)

  return focusBlock && !isTextBlock(snapshot.context, focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}
