import type {PortableTextObject} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getAncestors} from '../node-traversal/get-ancestors'
import {getNode} from '../node-traversal/get-node'
import {isInline} from '../node-traversal/is-inline'
import {isVoidNode} from '../slate/node/is-void-node'
import type {BlockPath} from '../types/paths'

/**
 * Returns the void block object containing the focus selection, resolved at
 * any depth.
 *
 * Excludes void inline objects (whose parent is a text block) and editable
 * containers. When the focus is at root, behavior is unchanged.
 *
 * @public
 */
export const getFocusBlockObject: EditorSelector<
  {node: PortableTextObject; path: BlockPath} | undefined
> = (snapshot) => {
  const selection = snapshot.context.selection

  if (!selection) {
    return undefined
  }

  const focusPath = selection.focus.path
  const focusNode = getNode(snapshot.context, focusPath)

  if (
    focusNode &&
    isVoidNode(snapshot.context, focusNode.node, focusNode.path) &&
    !isInline(snapshot.context, focusNode.path)
  ) {
    return {node: focusNode.node, path: focusNode.path}
  }

  for (const ancestor of getAncestors(snapshot.context, focusPath)) {
    if (
      isVoidNode(snapshot.context, ancestor.node, ancestor.path) &&
      !isInline(snapshot.context, ancestor.path)
    ) {
      return {node: ancestor.node, path: ancestor.path}
    }
  }

  return undefined
}
