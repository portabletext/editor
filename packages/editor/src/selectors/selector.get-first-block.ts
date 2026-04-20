import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getChildren} from '../node-traversal/get-children'
import type {Path} from '../slate/interfaces/path'
import {parentPath} from '../slate/path/parent-path'
import {getFocusBlock} from './selector.get-focus-block'

/**
 * Returns the first block at the current container scope.
 *
 * When the focus is inside an editable container (e.g. a code block's line),
 * this returns the first block within that container (the first line). When
 * the focus is at root, or there is no selection, this returns the first
 * block in the document.
 *
 * @public
 */
export const getFirstBlock: EditorSelector<
  {node: PortableTextBlock; path: Path} | undefined
> = (snapshot) => {
  const focusBlock = getFocusBlock(snapshot)

  if (focusBlock) {
    const siblings = getChildren(snapshot.context, parentPath(focusBlock.path))
    const first = siblings.at(0)

    if (first) {
      return {node: first.node as PortableTextBlock, path: first.path}
    }
  }

  const node = snapshot.context.value[0]

  return node ? {node, path: [{_key: node._key}]} : undefined
}
