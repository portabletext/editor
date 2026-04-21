import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getNodes} from '../node-traversal/get-nodes'
import {getBlock, isBlock} from '../node-traversal/is-block'
import type {Path} from '../slate/interfaces/path'
import {isAncestorPath} from '../slate/path/is-ancestor-path'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'

/**
 * Returns the blocks touched by the selection, resolved at any depth.
 *
 * When the selection spans only blocks inside an editable container, only
 * those container-internal blocks are returned (the enclosing container
 * itself is not). Root-level behavior is unchanged.
 *
 * @public
 */
export const getSelectedBlocks: EditorSelector<
  Array<{node: PortableTextBlock; path: Path}>
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return []
  }

  const startPoint = getSelectionStartPoint(snapshot.context.selection)
  const endPoint = getSelectionEndPoint(snapshot.context.selection)

  if (!startPoint || !endPoint) {
    return []
  }

  const allBlocks: Array<{node: PortableTextBlock; path: Path}> = []

  for (const entry of getNodes(
    {
      ...snapshot.context,
      blockIndexMap: snapshot.blockIndexMap,
    },
    {
      from: startPoint.path,
      to: endPoint.path,
      match: (_, path) => isBlock(snapshot.context, path),
    },
  )) {
    const block = getBlock(snapshot.context, entry.path)

    if (block) {
      allBlocks.push(block)
    }
  }

  // Keep only innermost blocks: drop any block that is a strict ancestor of
  // another block in the result. Containers that enclose lines are filtered
  // out, leaving just the lines.
  return allBlocks.filter(
    (block, index) =>
      !allBlocks.some(
        (other, otherIndex) =>
          otherIndex !== index && isAncestorPath(block.path, other.path),
      ),
  )
}
