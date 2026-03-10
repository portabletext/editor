import {Editor, Node, Path} from '../slate'
import type {Point} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {rangeRefAffinities} from './range-ref-affinities'

/**
 * Transform a path for a move_node operation.
 *
 * When a node at `fromPath` is moved to `toPath`:
 * - Paths inside or equal to the moved node follow it to the new location
 * - Paths at the old location shift to fill the gap
 * - Paths at the new location shift to make room
 *
 * Note: `toPath` refers to the position in the tree AFTER the node at
 * `fromPath` has been removed.
 */
function transformPathForMove(
  path: Path,
  fromPath: Path,
  toPath: Path,
): Path | null {
  const p = [...path]

  if (Path.equals(fromPath, toPath)) {
    return p
  }

  if (Path.isAncestor(fromPath, p) || Path.equals(fromPath, p)) {
    const copy = toPath.slice()

    if (Path.endsBefore(fromPath, toPath) && fromPath.length < toPath.length) {
      copy[fromPath.length - 1] = copy[fromPath.length - 1]! - 1
    }

    return copy.concat(p.slice(fromPath.length))
  } else if (
    Path.isSibling(fromPath, toPath) &&
    (Path.isAncestor(toPath, p) || Path.equals(toPath, p))
  ) {
    if (Path.endsBefore(fromPath, p)) {
      p[fromPath.length - 1] = p[fromPath.length - 1]! - 1
    } else {
      p[fromPath.length - 1] = p[fromPath.length - 1]! + 1
    }
  } else if (
    Path.endsBefore(toPath, p) ||
    Path.equals(toPath, p) ||
    Path.isAncestor(toPath, p)
  ) {
    if (Path.endsBefore(fromPath, p)) {
      p[fromPath.length - 1] = p[fromPath.length - 1]! - 1
    }

    p[toPath.length - 1] = p[toPath.length - 1]! + 1
  } else if (Path.endsBefore(fromPath, p)) {
    if (Path.equals(toPath, p)) {
      p[toPath.length - 1] = p[toPath.length - 1]! + 1
    }

    p[fromPath.length - 1] = p[fromPath.length - 1]! - 1
  }

  return p
}

/**
 * Transform a point for a move_node operation.
 * Move only affects paths, not offsets within text nodes.
 */
function transformPointForMove(
  point: Point,
  fromPath: Path,
  toPath: Path,
  _affinity?: 'forward' | 'backward' | null,
): Point | null {
  const path = transformPathForMove(point.path, fromPath, toPath)
  if (!path) {
    return null
  }
  return {path, offset: point.offset}
}

/**
 * Move a node from one path to another using only patch-compliant
 * operations (remove_node + insert_node).
 *
 * Because the decomposed operations would produce different ref-transform
 * semantics than a single move, we pre-transform all active refs with
 * the move semantics directly and suppress ref transforms for the
 * individual low-level operations.
 */
export function applyMoveNode(
  editor: PortableTextSlateEditor,
  path: Path,
  newPath: Path,
): void {
  if (Path.equals(path, newPath)) {
    return
  }

  if (Path.isAncestor(path, newPath)) {
    throw new Error(
      `Cannot move a path [${path}] to new path [${newPath}] because the destination is inside itself.`,
    )
  }

  const node = Node.get(editor, path, editor.schema)

  // Pre-transform all refs with move semantics
  for (const ref of Editor.pathRefs(editor)) {
    const current = ref.current
    if (current) {
      ref.current = transformPathForMove(current, path, newPath)
    }
  }
  for (const ref of Editor.pointRefs(editor)) {
    const current = ref.current
    if (current) {
      ref.current = transformPointForMove(current, path, newPath)
    }
  }
  for (const ref of Editor.rangeRefs(editor)) {
    const current = ref.current
    if (current) {
      const [anchorAffinity, focusAffinity] = rangeRefAffinities(current, ref.affinity)
      const anchor = transformPointForMove(current.anchor, path, newPath, anchorAffinity)
      const focus = transformPointForMove(current.focus, path, newPath, focusAffinity)
      if (anchor && focus) {
        ref.current = {anchor, focus}
      } else {
        ref.current = null
        ref.unref()
      }
    }
  }

  // Pre-transform editor.selection
  if (editor.selection) {
    const anchor = transformPointForMove(editor.selection.anchor, path, newPath)
    const focus = transformPointForMove(editor.selection.focus, path, newPath)
    if (anchor && focus) {
      editor.selection = {anchor, focus}
    }
  }

  // Temporarily remove all refs so the decomposed operations don't
  // double-transform them
  const pathRefs = new Set(Editor.pathRefs(editor))
  const pointRefs = new Set(Editor.pointRefs(editor))
  const rangeRefs = new Set(Editor.rangeRefs(editor))
  Editor.pathRefs(editor).clear()
  Editor.pointRefs(editor).clear()
  Editor.rangeRefs(editor).clear()

  // Save the pre-transformed selection so decomposed operations don't
  // double-transform it
  const savedSelection = editor.selection

  // In Slate's move_node semantics, newPath already refers to the position
  // in the tree AFTER the node at path has been removed. So we use newPath
  // directly as the insert position — no adjustment needed.
  try {
    Editor.withoutNormalizing(editor, () => {
      editor.apply({type: 'remove_node', path, node})
      editor.apply({type: 'insert_node', path: newPath, node})
    })
  } finally {
    // Restore pre-transformed selection (decomposed ops may have
    // double-transformed it)
    editor.selection = savedSelection

    // Restore all refs
    for (const ref of pathRefs) {
      Editor.pathRefs(editor).add(ref)
    }
    for (const ref of pointRefs) {
      Editor.pointRefs(editor).add(ref)
    }
    for (const ref of rangeRefs) {
      Editor.rangeRefs(editor).add(ref)
    }
  }
}
