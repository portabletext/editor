import type {
  EditorSelectionPoint,
  EditorSnapshot,
  Path,
} from '@portabletext/editor'
import {
  getBlock,
  getFirstChild,
  getLastChild,
} from '@portabletext/editor/traversal'
import {getBlockEndPoint, getBlockStartPoint} from '@portabletext/editor/utils'

/** The point at the start of the cell's first block. */
export function cellStartPoint(
  snapshot: EditorSnapshot,
  cellPath: Path,
): EditorSelectionPoint | undefined {
  const firstChild = getFirstChild(snapshot, cellPath)
  const firstBlock = firstChild && getBlock(snapshot, firstChild.path)
  if (!firstBlock) {
    return undefined
  }
  return getBlockStartPoint({context: snapshot.context, block: firstBlock})
}

/** The point at the end of the cell's last block. */
export function cellEndPoint(
  snapshot: EditorSnapshot,
  cellPath: Path,
): EditorSelectionPoint | undefined {
  const lastChild = getLastChild(snapshot, cellPath)
  const lastBlock = lastChild && getBlock(snapshot, lastChild.path)
  if (!lastBlock) {
    return undefined
  }
  return getBlockEndPoint({context: snapshot.context, block: lastBlock})
}
