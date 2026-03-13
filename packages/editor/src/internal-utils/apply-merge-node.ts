import {
  Element,
  Node as NodeUtils,
  Path,
  Range,
  Text,
  type Node,
  type Point,
} from '../slate'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import type {PortableTextSlateEditor} from '../types/slate-editor'

/**
 * Merge a node at the given path into its previous sibling using only
 * patch-compliant operations (insert_text/insert_node + remove_node).
 *
 * Because the decomposed operations would produce different ref-transform
 * semantics than a single merge, we pre-transform all active refs with
 * the merge semantics directly and suppress ref transforms for the
 * individual low-level operations.
 *
 * For text nodes: appends the text to the previous sibling, then removes the node.
 * For element nodes: moves children into the previous sibling, then removes the node.
 */
export function applyMergeNode(
  editor: PortableTextSlateEditor,
  path: Path,
  position: number,
): void {
  const node = NodeUtils.get(editor, path, editor.schema)
  const prevPath = Path.previous(path)

  // Pre-transform all refs with merge semantics
  for (const ref of editor.pathRefs) {
    const current = ref.current
    if (current) {
      ref.current = transformPathForMerge(current, path, position)
    }
  }
  for (const ref of editor.pointRefs) {
    const current = ref.current
    if (current) {
      ref.current = transformPointForMerge(current, path, position)
    }
  }
  for (const ref of editor.rangeRefs) {
    const current = ref.current
    if (current) {
      const anchor = transformPointForMerge(current.anchor, path, position)
      const focus = transformPointForMerge(current.focus, path, position)
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
    const anchor = transformPointForMerge(
      editor.selection.anchor,
      path,
      position,
    )
    const focus = transformPointForMerge(editor.selection.focus, path, position)
    if (anchor && focus) {
      editor.selection = {anchor, focus}
    }
  }

  // Temporarily remove all refs so the decomposed operations don't
  // double-transform them
  const pathRefs = new Set(editor.pathRefs)
  const pointRefs = new Set(editor.pointRefs)
  const rangeRefs = new Set(editor.rangeRefs)
  editor.pathRefs.clear()
  editor.pointRefs.clear()
  editor.rangeRefs.clear()

  // Save the pre-transformed selection
  const savedSelection = editor.selection

  // Pre-transform DOM-layer pending state with merge semantics, then
  // suppress transforms during the decomposed operations by clearing them.
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
        }) => transformTextDiffForMerge(textDiff, path, position),
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
    const anchor = transformPointForMerge(sel.anchor, path, position)
    const focus = transformPointForMerge(sel.focus, path, position)
    editorAny['pendingSelection'] = anchor && focus ? {anchor, focus} : null
  }

  if (
    savedPendingAction &&
    typeof savedPendingAction === 'object' &&
    'at' in (savedPendingAction as Record<string, unknown>)
  ) {
    const action = savedPendingAction as {at: Point | Range}
    if ('offset' in action.at && typeof action.at.offset === 'number') {
      const at = transformPointForMerge(action.at as Point, path, position)
      editorAny['pendingAction'] = at ? {...action, at} : null
    } else if (Range.isRange(action.at)) {
      const anchor = transformPointForMerge(action.at.anchor, path, position)
      const focus = transformPointForMerge(action.at.focus, path, position)
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
    withoutNormalizing(editor, () => {
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
      editor.pathRefs.add(ref)
    }
    for (const ref of pointRefs) {
      editor.pointRefs.add(ref)
    }
    for (const ref of rangeRefs) {
      editor.rangeRefs.add(ref)
    }

    // Restore pre-transformed pending state
    editorAny['pendingDiffs'] = preTransformedPendingDiffs
    editorAny['pendingSelection'] = preTransformedPendingSelection
    editorAny['pendingAction'] = preTransformedPendingAction
  }
}

/**
 * Transform a text diff for a merge operation.
 */
function transformTextDiffForMerge(
  textDiff: {
    diff: {start: number; end: number; text: string}
    id: number
    path: Path
  },
  mergePath: Path,
  position: number,
): {
  diff: {start: number; end: number; text: string}
  id: number
  path: Path
} | null {
  const {path, diff, id} = textDiff

  if (!Path.equals(mergePath, path)) {
    const newPath = transformPathForMerge(path, mergePath, position)
    if (!newPath) {
      return null
    }
    return {diff, id, path: newPath}
  }

  return {
    diff: {
      start: diff.start + position,
      end: diff.end + position,
      text: diff.text,
    },
    id,
    path: transformPathForMerge(path, mergePath, position)!,
  }
}

/**
 * Transform a path for a merge_node operation.
 *
 * When a node at `mergePath` is merged into its previous sibling:
 * - The merged node disappears, so paths at or after it shift back by 1
 * - Children of the merged node move into the previous sibling at `position`
 */
function transformPathForMerge(
  path: Path,
  mergePath: Path,
  position: number,
): Path | null {
  const p = [...path]

  if (Path.equals(mergePath, p) || Path.endsBefore(mergePath, p)) {
    p[mergePath.length - 1] = p[mergePath.length - 1]! - 1
  } else if (Path.isAncestor(mergePath, p)) {
    p[mergePath.length - 1] = p[mergePath.length - 1]! - 1
    p[mergePath.length] = p[mergePath.length]! + position
  }

  return p
}

/**
 * Transform a point for a merge_node operation.
 *
 * If the point is inside the merged node, its offset shifts by `position`
 * (the number of children/characters already in the merge target).
 */
function transformPointForMerge(
  point: Point,
  mergePath: Path,
  position: number,
): Point {
  let {path, offset} = point

  if (Path.equals(mergePath, path)) {
    offset += position
  }

  path = transformPathForMerge(path, mergePath, position)!

  return {path, offset}
}
