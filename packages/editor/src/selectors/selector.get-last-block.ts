import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getChildren} from '../node-traversal/get-children'
import {getBlock} from '../node-traversal/is-block'
import {parentPath} from '../slate/path/parent-path'
import type {BlockPath} from '../types/paths'
import {getFocusBlock} from './selector.get-focus-block'

/**
 * Returns the last block at the current container scope.
 *
 * When the focus is inside an editable container (e.g. a code block's line),
 * this returns the last block within that container (the last line). When
 * the focus is at root, or there is no selection, this returns the last
 * block in the document.
 *
 * @public
 */
export const getLastBlock: EditorSelector<
  {node: PortableTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  const focusBlock = getFocusBlock(snapshot)

  if (focusBlock) {
    const siblings = getChildren(snapshot.context, parentPath(focusBlock.path))
    const last = siblings.at(-1)

    if (last) {
      return getBlock(snapshot.context, last.path)
    }
  }

  const node = snapshot.context.value.at(-1)

  return node ? {node, path: [{_key: node._key}]} : undefined
}
