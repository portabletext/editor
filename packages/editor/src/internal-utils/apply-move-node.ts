import {
  Editor,
  Node,
  Path,
  PathRef,
  Point,
  PointRef,
  Range,
  RangeRef,
} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'

/**
 * Move a node from one path to another using only patch-compliant
 * operations (remove_node + insert_node).
 *
 * This replaces direct `editor.apply({type: 'move_node', ...})` calls
 * to eliminate move_node from the operation vocabulary.
 *
 * Because move_node has specific ref-transform semantics that can't be
 * replicated by the incremental transforms of the decomposed operations,
 * we pre-transform all active refs with the equivalent move_node operation
 * and then suppress ref transforms for the individual low-level operations.
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

  // Build the equivalent move_node operation for ref transforms
  const moveOp = {
    type: 'move_node' as const,
    path,
    newPath,
  }

  // Pre-transform all refs as if a move_node happened
  for (const ref of Editor.pathRefs(editor)) {
    PathRef.transform(ref, moveOp)
  }
  for (const ref of Editor.pointRefs(editor)) {
    PointRef.transform(ref, moveOp)
  }
  for (const ref of Editor.rangeRefs(editor)) {
    RangeRef.transform(ref, moveOp)
  }

  // Pre-transform editor.selection as if a move_node happened
  if (editor.selection) {
    const sel = {...editor.selection}
    for (const [point, key] of Range.points(sel)) {
      sel[key] = Point.transform(point, moveOp)!
    }
    editor.selection = sel
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
