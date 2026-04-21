import {isTextBlock, type PortableTextTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getAncestor} from '../node-traversal/get-ancestor'
import {getNode} from '../node-traversal/get-node'
import type {Path} from '../slate/interfaces/path'

/**
 * Returns the text block containing the focus selection, resolved at any depth.
 *
 * When the focus is inside an editable container (e.g. a code block's line),
 * this returns the innermost text block ancestor (the line), not the outer
 * container. When the focus is at root, behavior is unchanged.
 *
 * @public
 */
export const getFocusTextBlock: EditorSelector<
  {node: PortableTextTextBlock; path: Path} | undefined
> = (snapshot) => {
  const selection = snapshot.context.selection

  if (!selection) {
    return undefined
  }

  const focusPath = selection.focus.path
  const focusNode = getNode(snapshot.context, focusPath)

  if (focusNode && isTextBlock(snapshot.context, focusNode.node)) {
    return {node: focusNode.node, path: focusNode.path}
  }

  const ancestor = getAncestor(snapshot.context, focusPath, (node) =>
    isTextBlock(snapshot.context, node),
  )

  if (ancestor && isTextBlock(snapshot.context, ancestor.node)) {
    return {node: ancestor.node, path: ancestor.path}
  }

  return undefined
}
