import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import type {TraversalSnapshot} from './traversal-snapshot'
import {hasNodeSegmentFrom, walkPath} from './walk-path'

/**
 * Get the node at a given path.
 *
 * Node segments can be keyed (`{_key}`, resolved by matching `_key`) or
 * indexed (numbers, resolved by index). Either way, a field name string
 * names the structural descent between every two node segments:
 * `[{_key:'b1'}, 'children', {_key:'s1'}]` and `[0, 'children', 0]`
 * both address the first block's span. A compact path that leaves the
 * field out, such as `[0, 0]`, addresses nothing and returns `undefined`.
 *
 * The returned `path` always identifies the returned node: segments
 * are keyed wherever the node has a usable `_key` (numeric indices are
 * converted to `KeyedSegment`s), and stay numeric for nodes
 * normalization has not keyed yet (a `{_key: undefined}` segment would
 * not distinguish keyless siblings). Any trailing segments in the
 * input that point outside the value tree — e.g. an object node's
 * primitive field, or an annotation reached via `'markDefs'` on a text
 * block — are stripped so that
 * `getNode(snapshot, entry.path).node === entry.node`.
 *
 * The walk stops when a string segment names a field that isn't the
 * current node's structural child array. Annotations live in
 * `markDefs` on a text block, alongside `children` rather than inside
 * it, so `getNode` resolves an annotation path to the enclosing text
 * block. Use `getAnnotation` to resolve the annotation itself.
 *
 * @public
 */
export function getNode(
  snapshot: TraversalSnapshot,
  path: Path,
): {node: Node; path: Path} | undefined {
  const result = resolveNode(snapshot, path)
  return result.status === 'found' ? result.entry : undefined
}

/**
 * Result of walking a path against a snapshot.
 *
 * `unreachable` is the one outcome that means "structurally impossible
 * by design": the path digs past a sidecar field (e.g. `markDefs` on
 * a text block) into a keyed/indexed segment, which `getNode` can
 * never resolve (use `getAnnotation` for annotations). Every other
 * negative outcome is `missing`; on those branches a caller bug and a
 * benign race (the node removed by a concurrent edit) produce the
 * same state, so they cannot be told apart.
 */
export type ResolveNodeResult =
  | {status: 'found'; entry: {node: Node; path: Path}}
  | {status: 'missing'}
  | {status: 'unreachable'}

export function resolveNode(
  snapshot: TraversalSnapshot,
  path: Path,
): ResolveNodeResult {
  const walk = walkPath(snapshot, path)

  if (walk.status !== 'found') {
    return {status: 'missing'}
  }

  const node = walk.nodes.at(-1)

  if (!node) {
    return {status: 'missing'}
  }

  if (hasNodeSegmentFrom(walk.rest, 0)) {
    return node.children ? {status: 'unreachable'} : {status: 'missing'}
  }

  return {status: 'found', entry: {node: node.node, path: node.path}}
}
