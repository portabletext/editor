import {getNode} from '../node-traversal/get-node'
import {getNodes} from '../node-traversal/get-nodes'
import {pathRef} from '../slate/editor/path-ref'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {isAncestorPath} from '../slate/path/is-ancestor-path'
import type {PortableTextSlateEditor} from '../types/slate-editor'

/**
 * Apply `unset` to every node matching `predicate` between `from` and
 * `to` (inclusive), keeping only the deepest match along each branch so we
 * don't unset both an ancestor and a descendant.
 *
 * Path refs are taken before any mutation so each unset runs against a path
 * that survives the previous unsets' shifts.
 */
export function unsetMatchedNodesInRange(
  editor: PortableTextSlateEditor,
  from: Path,
  to: Path,
  predicate: (node: Node, path: Path) => boolean,
): void {
  const candidates: Array<{node: Node; path: Path}> = []

  for (const entry of getNodes(editor, {
    from,
    to,
    match: predicate,
  })) {
    candidates.push(entry)
  }

  // Drop any candidate whose path is an ancestor of a later candidate.
  const matches = candidates.filter(
    (candidate, index) =>
      !candidates.some(
        (other, otherIndex) =>
          otherIndex > index && isAncestorPath(candidate.path, other.path),
      ),
  )

  const matchPathRefs = matches.map((entry) => pathRef(editor, entry.path))

  for (const ref of matchPathRefs) {
    const path = ref.unref()
    if (!path) {
      continue
    }
    if (!getNode(editor, path)) {
      continue
    }
    editor.apply({type: 'unset', path})
  }
}
