import {isTextBlock, type PortableTextTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getEnclosingBlock} from '../node-traversal/get-enclosing-block'
import {getNodes} from '../node-traversal/get-nodes'
import type {Path} from '../slate/interfaces/path'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'

/**
 * Returns the text blocks touched by the selection, resolved at any depth.
 *
 * Walks the tree between the selection endpoints and returns every text
 * block found, regardless of container nesting. For toolbar state and
 * anywhere that needs "text blocks with text in the selection".
 *
 * @public
 */
export const getSelectedTextBlocks: EditorSelector<
  Array<{node: PortableTextTextBlock; path: Path}>
> = (snapshot) => {
  const selection = snapshot.context.selection

  if (!selection) {
    return []
  }

  const startPoint = getSelectionStartPoint(selection)
  const endPoint = getSelectionEndPoint(selection)

  if (!startPoint || !endPoint) {
    return []
  }

  // Fast path: when both endpoints sit inside the same text block - the
  // common case for toolbar state on a collapsed or single-block
  // selection - skip the range walk entirely. The range walk visits
  // every descendant in document order between the endpoints; that's
  // O(tree) work and gets very expensive in deeply nested containers.
  const startBlock = getEnclosingBlock(snapshot, startPoint.path)
  const endBlock = getEnclosingBlock(snapshot, endPoint.path)
  if (
    startBlock &&
    endBlock &&
    startBlock.node._key === endBlock.node._key &&
    isTextBlock(snapshot.context, startBlock.node)
  ) {
    return [{node: startBlock.node, path: startBlock.path}]
  }

  const result: Array<{node: PortableTextTextBlock; path: Path}> = []

  for (const entry of getNodes(snapshot, {
    from: startPoint.path,
    to: endPoint.path,
    match: (node) => isTextBlock(snapshot.context, node),
  })) {
    if (isTextBlock(snapshot.context, entry.node)) {
      result.push({node: entry.node, path: entry.path})
    }
  }

  return result
}
