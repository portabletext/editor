import {
  hasNodeSegmentFrom,
  walkPath,
  type WalkedNode,
} from '../../traversal/walk-path'
import type {Editor} from '../interfaces/editor'
import type {EngineOperation} from '../interfaces/operation'
import type {Path} from '../interfaces/path'

/**
 * What an operation's path addresses, resolved once by `apply` before any
 * listener, ref or change sees the operation.
 *
 * - `root`: the editor's top-level value (`set`/`unset` at `[]`).
 * - `node`: the node at the last of `nodes`, with `propertyPath` naming a
 *   property on it (empty for the node itself).
 * - `position`: the end of the structural child array of the last of
 *   `ownerNodes` (the root when empty), named by an index equal to the
 *   array's length.
 * - `data`: a data path (`dataPath`) inside the node at the last of
 *   `nodes`, through a field other than its structural child field
 *   (`markDefs`, `marks`, a block object's own array).
 * - `selection`: a `set.selection` whose points are all addressable paths.
 *
 * `undefined` means the operation addresses nothing.
 */
export type OperationTarget =
  | {kind: 'root'}
  | {kind: 'node'; nodes: Array<WalkedNode>; propertyPath: Array<string>}
  | {kind: 'position'; ownerNodes: Array<WalkedNode>; index: number}
  | {kind: 'data'; nodes: Array<WalkedNode>; dataPath: Path}
  | {kind: 'selection'}

export function resolveOperationTarget(
  editor: Editor,
  operation: EngineOperation,
): OperationTarget | undefined {
  if (operation.type === 'set.selection') {
    const {newProperties} = operation
    const points = newProperties
      ? [newProperties.anchor, newProperties.focus]
      : []

    return points.every(
      (point) =>
        point === undefined ||
        walkPath(editor.snapshot, point.path).status !== 'invalid',
    )
      ? {kind: 'selection'}
      : undefined
  }

  const {path} = operation

  if (path.length === 0) {
    return operation.type === 'set' || operation.type === 'unset'
      ? {kind: 'root'}
      : undefined
  }

  const walk = walkPath(editor.snapshot, path)

  if (walk.status === 'invalid') {
    return undefined
  }

  if (walk.status === 'missing') {
    const lastSegment = path[path.length - 1]

    // An insert may name the end of a structural child array by its length.
    return operation.type === 'insert' &&
      walk.segmentIndex === path.length - 1 &&
      lastSegment === walk.siblings.length
      ? {kind: 'position', ownerNodes: walk.nodes, index: lastSegment}
      : undefined
  }

  if (walk.nodes.length === 0) {
    return undefined
  }

  if (hasNodeSegmentFrom(walk.rest, 0)) {
    return {kind: 'data', nodes: walk.nodes, dataPath: walk.rest}
  }

  return {
    kind: 'node',
    nodes: walk.nodes,
    propertyPath: walk.rest as Array<string>,
  }
}
