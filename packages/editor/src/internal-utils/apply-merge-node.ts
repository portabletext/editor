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
  type Operation,
} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'

/**
 * Merge a node at the given path into its previous sibling using only
 * patch-compliant operations (insert_text/insert_node + remove_node).
 *
 * This replaces direct `editor.apply({type: 'merge_node', ...})` calls
 * to eliminate merge_node from the operation vocabulary.
 *
 * Because merge_node has specific ref-transform semantics that can't be
 * replicated by the incremental transforms of the decomposed operations,
 * we pre-transform all active refs with the equivalent merge_node operation
 * and then suppress ref transforms for the individual low-level operations.
 *
 * For text nodes: appends the text to the previous sibling, then removes the node.
 * For element nodes: moves children into the previous sibling, then removes the node.
 */
export function applyMergeNode(
  editor: PortableTextSlateEditor,
  path: Path,
  position: number,
  properties: Record<string, unknown>,
): void {
  const node = NodeUtils.get(editor, path, editor.schema)
  const prevPath = Path.previous(path)

  // Build the equivalent merge_node operation for ref transforms
  const mergeOp: Operation = {
    type: 'merge_node' as const,
    path,
    position,
    properties,
  }

  // Pre-transform all refs as if a merge_node happened
  for (const ref of Editor.pathRefs(editor)) {
    PathRef.transform(ref, mergeOp)
  }
  for (const ref of Editor.pointRefs(editor)) {
    PointRef.transform(ref, mergeOp)
  }
  for (const ref of Editor.rangeRefs(editor)) {
    RangeRef.transform(ref, mergeOp)
  }

  // Pre-transform editor.selection as if a merge_node happened
  if (editor.selection) {
    const sel = {...editor.selection}
    for (const [point, key] of Range.points(sel)) {
      const result = Point.transform(point, mergeOp)
      if (result) {
        sel[key] = result
      }
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

  // Save the pre-transformed selection
  const savedSelection = editor.selection

  // Pre-transform DOM-layer pending state (pendingDiffs, pendingSelection,
  // pendingAction) with the merge_node operation, then suppress transforms
  // during the decomposed operations by temporarily clearing them.
  // These properties are added by the DOM plugin at runtime.
  const editorAny = editor as unknown as Record<string, unknown>
  const savedPendingDiffs = editorAny['pendingDiffs']
  const savedPendingSelection = editorAny['pendingSelection']
  const savedPendingAction = editorAny['pendingAction']

  if (Array.isArray(savedPendingDiffs) && savedPendingDiffs.length > 0) {
    editorAny['pendingDiffs'] = savedPendingDiffs
      .map(
        (textDiff: {
          diff: {start: number; end: number; text: string}
          id: number
          path: Path
        }) =>
          transformTextDiffForMerge(
            textDiff,
            mergeOp as {
              type: 'merge_node'
              path: Path
              position: number
              properties: Record<string, unknown>
            },
          ),
      )
      .filter(Boolean)
  }

  if (
    savedPendingSelection &&
    typeof savedPendingSelection === 'object' &&
    'anchor' in (savedPendingSelection as Record<string, unknown>) &&
    'focus' in (savedPendingSelection as Record<string, unknown>)
  ) {
    const sel = savedPendingSelection as Range
    const anchor = Point.transform(sel.anchor, mergeOp, {
      affinity: 'backward',
    })
    const focus = Point.transform(sel.focus, mergeOp, {affinity: 'backward'})
    editorAny['pendingSelection'] = anchor && focus ? {anchor, focus} : null
  }

  if (
    savedPendingAction &&
    typeof savedPendingAction === 'object' &&
    'at' in (savedPendingAction as Record<string, unknown>)
  ) {
    const action = savedPendingAction as {at: Point | Range}
    if (Point.isPoint(action.at)) {
      const at = Point.transform(action.at, mergeOp, {affinity: 'backward'})
      editorAny['pendingAction'] = at ? {...action, at} : null
    } else if (Range.isRange(action.at)) {
      const anchor = Point.transform(action.at.anchor, mergeOp, {
        affinity: 'backward',
      })
      const focus = Point.transform(action.at.focus, mergeOp, {
        affinity: 'backward',
      })
      editorAny['pendingAction'] =
        anchor && focus ? {...action, at: {anchor, focus}} : null
    }
  }

  // Save the pre-transformed pending state and clear it so decomposed
  // operations don't double-transform it
  const preTransformedPendingDiffs = editorAny['pendingDiffs']
  const preTransformedPendingSelection = editorAny['pendingSelection']
  const preTransformedPendingAction = editorAny['pendingAction']
  editorAny['pendingDiffs'] = []
  editorAny['pendingSelection'] = null
  editorAny['pendingAction'] = null

  try {
    Editor.withoutNormalizing(editor, () => {
      if (Text.isText(node, editor.schema)) {
        // Merge text: insert the text into the previous sibling at the position
        if (node.text.length > 0) {
          editor.apply({
            type: 'insert_text',
            path: prevPath,
            offset: position,
            text: node.text,
          })
        }
        // Remove the now-redundant text node
        editor.apply({type: 'remove_node', path, node: node as Node})
      } else if (Element.isElement(node, editor.schema)) {
        // Merge element: move all children into the previous sibling
        const children = node.children
        for (let i = 0; i < children.length; i++) {
          editor.apply({
            type: 'insert_node',
            path: [...prevPath, position + i],
            node: children[i]!,
          })
        }
        // Remove the now-empty element
        editor.apply({type: 'remove_node', path, node: node as Node})
      }
    })
  } finally {
    // Restore pre-transformed selection
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

    // Restore pre-transformed pending state
    editorAny['pendingDiffs'] = preTransformedPendingDiffs
    editorAny['pendingSelection'] = preTransformedPendingSelection
    editorAny['pendingAction'] = preTransformedPendingAction
  }
}

/**
 * Transform a text diff for a merge_node operation.
 * This replicates the logic from slate-dom's transformTextDiff for merge_node.
 */
function transformTextDiffForMerge(
  textDiff: {
    diff: {start: number; end: number; text: string}
    id: number
    path: Path
  },
  op: {
    type: 'merge_node'
    path: Path
    position: number
    properties: Record<string, unknown>
  },
): {
  diff: {start: number; end: number; text: string}
  id: number
  path: Path
} | null {
  const {path, diff, id} = textDiff

  if (!Path.equals(op.path, path)) {
    const newPath = Path.transform(path, op)
    if (!newPath) {
      return null
    }
    return {diff, id, path: newPath}
  }

  return {
    diff: {
      start: diff.start + op.position,
      end: diff.end + op.position,
      text: diff.text,
    },
    id,
    path: Path.transform(path, op)!,
  }
}
