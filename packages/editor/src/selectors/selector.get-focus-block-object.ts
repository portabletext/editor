import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {isEditableContainer} from '../schema/is-editable-container'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import type {BlockPath} from '../types/paths'
import {getFocusBlock} from './selector.get-focus-block'

/**
 * Returns the void block object containing the focus selection, resolved at
 * any depth.
 *
 * Excludes text blocks and editable containers (which have their own children
 * and are not "void"). When the focus is at root, behavior is unchanged.
 *
 * @public
 */
export const getFocusBlockObject: EditorSelector<
  {node: PortableTextObject; path: BlockPath} | undefined
> = (snapshot) => {
  const focusBlock = getFocusBlock(snapshot)

  if (!focusBlock) {
    return undefined
  }

  if (isTextBlockNode(snapshot.context, focusBlock.node)) {
    return undefined
  }

  if (isEditableContainer(snapshot.context, focusBlock.node, focusBlock.path)) {
    return undefined
  }

  return {node: focusBlock.node, path: focusBlock.path}
}
