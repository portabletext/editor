import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import type {BlockPath} from '../types/paths'
import {getFocusBlock} from './selector.get-focus-block'

/**
 * @public
 */
export const getFocusBlockObject: EditorSelector<
  {node: PortableTextObject; path: BlockPath} | undefined
> = (snapshot) => {
  const focusBlock = getFocusBlock(snapshot)

  return focusBlock && !isTextBlockNode(snapshot.context, focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}
