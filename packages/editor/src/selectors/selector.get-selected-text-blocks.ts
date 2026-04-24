import {isTextBlock, type PortableTextTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
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

  const result: Array<{node: PortableTextTextBlock; path: Path}> = []

  for (const entry of getNodes(
    {
      ...snapshot.context,
      blockIndexMap: snapshot.blockIndexMap,
    },
    {
      from: startPoint.path,
      to: endPoint.path,
      match: (node) => isTextBlock(snapshot.context, node),
    },
  )) {
    if (isTextBlock(snapshot.context, entry.node)) {
      result.push({node: entry.node, path: entry.path})
    }
  }

  return result
}
