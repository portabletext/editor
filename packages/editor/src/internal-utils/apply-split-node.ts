import {
  Editor,
  Element,
  Node as NodeUtils,
  Path,
  PathRef,
  Point,
  PointRef,
  Range,
  RangeRef,
  Text,
  type Node,
} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'

/**
 * Split a node at the given path and position using only patch-compliant
 * operations (remove_text/remove_node + insert_node).
 *
 * This replaces direct `editor.apply({type: 'split_node', ...})` calls
 * to eliminate split_node from the operation vocabulary.
 *
 * Because split_node has specific ref-transform semantics that can't be
 * replicated by the incremental transforms of the decomposed operations,
 * we pre-transform all active refs with the equivalent split_node operation
 * and then suppress ref transforms for the individual low-level operations.
 */
export function applySplitNode(
  editor: PortableTextSlateEditor,
  path: Path,
  position: number,
  properties: Record<string, unknown>,
): void {
  const node = NodeUtils.get(editor, path, editor.schema)

  // Build the equivalent split_node operation for ref transforms
  const splitOp = {
    type: 'split_node' as const,
    path,
    position,
    properties,
  }

  // Pre-transform all refs as if a split_node happened
  for (const ref of Editor.pathRefs(editor)) {
    PathRef.transform(ref, splitOp)
  }
  for (const ref of Editor.pointRefs(editor)) {
    PointRef.transform(ref, splitOp)
  }
  for (const ref of Editor.rangeRefs(editor)) {
    RangeRef.transform(ref, splitOp)
  }

  // Pre-transform editor.selection as if a split_node happened
  if (editor.selection) {
    const sel = {...editor.selection}
    for (const [point, key] of Range.points(sel)) {
      sel[key] = Point.transform(point, splitOp)!
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

  try {
    Editor.withoutNormalizing(editor, () => {
      if (Text.isText(node, editor.schema)) {
        const afterText = node.text.slice(position)
        const newNode = {...properties, text: afterText} as Node

        editor.apply({
          type: 'remove_text',
          path,
          offset: position,
          text: afterText,
        })
        editor.apply({
          type: 'insert_node',
          path: Path.next(path),
          node: newNode,
        })
      } else if (Element.isElement(node, editor.schema)) {
        const afterChildren = node.children.slice(position)
        const newNode = {...properties, children: afterChildren} as Node

        for (let i = node.children.length - 1; i >= position; i--) {
          editor.apply({
            type: 'remove_node',
            path: [...path, i],
            node: node.children[i]!,
          })
        }
        editor.apply({
          type: 'insert_node',
          path: Path.next(path),
          node: newNode,
        })
      }
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
