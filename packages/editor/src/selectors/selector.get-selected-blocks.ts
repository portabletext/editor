import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getNodes} from '../traversal/get-nodes'
import {getBlock} from '../traversal/is-block'
import type {BlockPath} from '../types/paths'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Returns the root-level blocks the selection covers.
 *
 * Only looks at direct children of the editor. If the selection is inside
 * an editable container, the container itself is returned - not its inner
 * blocks. Containers are preserved whole.
 *
 * Use for block-level operations like `move.block up/down` and
 * drag-and-drop. For "selection as portable text" use `getSelectedValue`;
 * for "text blocks at any depth" use `getSelectedTextBlocks`.
 *
 * @public
 */
export const getSelectedBlocks: EditorSelector<
  Array<{node: PortableTextBlock; path: BlockPath}>
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

  // Fast path: when both endpoints share the same root-level block, that
  // single block is the answer. The range walk only needs to run when
  // the selection crosses block boundaries.
  const startRootKey = startPoint.path.find(isKeyedSegment)?._key
  const endRootKey = endPoint.path.find(isKeyedSegment)?._key
  if (startRootKey && startRootKey === endRootKey) {
    const block = getBlock(snapshot, [{_key: startRootKey}])
    if (block) {
      return [{node: block.node, path: block.path}]
    }
  }

  const result: Array<{node: PortableTextBlock; path: BlockPath}> = []

  for (const entry of getNodes(snapshot, {
    from: startPoint.path,
    to: endPoint.path,
    match: (_, path) => path.length === 1,
  })) {
    const block = getBlock(snapshot, entry.path)
    if (block) {
      result.push({node: block.node, path: block.path})
    }
  }

  return result
}
