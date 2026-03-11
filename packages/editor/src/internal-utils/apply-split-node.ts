import {
  Editor,
  Element,
  Node as NodeUtils,
  Path,
  Text,
  type Node,
  type Point,
} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {resolveSegmentIndex} from '../types/paths'
import {rangeRefAffinities} from './range-ref-affinities'

/**
 * Split a node at the given path and position using only patch-compliant
 * operations (remove_text/remove_node + insert_node).
 *
 * Because the decomposed operations would produce different ref-transform
 * semantics than a single split, we pre-transform all active refs with
 * the split semantics directly and suppress ref transforms for the
 * individual low-level operations.
 */
export function applySplitNode(
  editor: PortableTextSlateEditor,
  path: Path,
  position: number,
  properties: Record<string, unknown>,
): void {
  const node = NodeUtils.get(editor, path, editor.schema)

  // Pre-transform all refs with split semantics
  for (const ref of Editor.pathRefs(editor)) {
    const current = ref.current
    if (current) {
      ref.current = transformPathForSplit(
        editor,
        current,
        path,
        position,
        ref.affinity ?? 'forward',
      )
    }
  }
  for (const ref of Editor.pointRefs(editor)) {
    const current = ref.current
    if (current) {
      ref.current = transformPointForSplit(
        editor,
        current,
        path,
        position,
        ref.affinity ?? 'forward',
      )
    }
  }
  for (const ref of Editor.rangeRefs(editor)) {
    const current = ref.current
    if (current) {
      const [anchorAffinity, focusAffinity] = rangeRefAffinities(
        editor,
        current,
        ref.affinity,
      )
      const anchor = transformPointForSplit(
        editor,
        current.anchor,
        path,
        position,
        anchorAffinity ?? 'forward',
      )
      const focus = transformPointForSplit(
        editor,
        current.focus,
        path,
        position,
        focusAffinity ?? 'forward',
      )
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
    const anchor = transformPointForSplit(
      editor,
      editor.selection.anchor,
      path,
      position,
      'forward',
    )
    const focus = transformPointForSplit(
      editor,
      editor.selection.focus,
      path,
      position,
      'forward',
    )
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
          path: NodeUtils.next(editor, path, editor.schema) ?? path,
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
          path: NodeUtils.next(editor, path, editor.schema) ?? path,
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

/**
 * Transform a path for a split_node operation.
 *
 * When a node at `splitPath` is split at `position`:
 * - A new sibling appears after the split node, shifting later paths forward
 * - Children at or after `position` move into the new sibling
 *
 * The `affinity` parameter controls what happens when the path equals the
 * split path: 'forward' moves to the new node, 'backward' stays.
 */
function transformPathForSplit(
  editor: Editor,
  path: Path,
  splitPath: Path,
  position: number,
  affinity: 'forward' | 'backward' = 'forward',
): Path | null {
  const p = [...path]

  // During the transition to keyed paths, ref transforms still operate
  // on numeric indices. Cast segments to numbers for arithmetic.
  // TODO: With fully keyed paths, split transforms become trivial —
  // keys don't shift, only the split node itself changes.
  const splitDepth = splitPath.length - 1

  if (Path.equals(splitPath, p)) {
    if (affinity === 'forward') {
      {
      const parentPath = p.slice(0, p.length - 1)
      const parent = NodeUtils.getIf(editor, parentPath, editor.schema)
      const siblings = parent ? ((parent as any).children ?? []) : []
      p[p.length - 1] = resolveSegmentIndex(siblings, p[p.length - 1]!) + 1
    }
    }
    // backward: no change
  } else if (NodeUtils.isBefore(editor, splitPath, p, editor.schema)) {
    {
      const parentPath = p.slice(0, splitDepth)
      const parent = NodeUtils.getIf(editor, parentPath, editor.schema)
      const siblings = parent ? ((parent as any).children ?? []) : []
      p[splitDepth] = resolveSegmentIndex(siblings, p[splitDepth]!) + 1
    }
  } else if (
    Path.isAncestor(splitPath, p) &&
    resolveSegmentIndex(
      (NodeUtils.getIf(editor, path.slice(0, splitPath.length), editor.schema) as any)?.children ?? [],
      path[splitPath.length]!
    ) >= position
  ) {
    const parentPath3 = p.slice(0, splitDepth)
    const parent3 = NodeUtils.getIf(editor, parentPath3, editor.schema)
    const siblings3 = parent3 ? ((parent3 as any).children ?? []) : []
    p[splitDepth] = resolveSegmentIndex(siblings3, p[splitDepth]!) + 1
    const innerParent = NodeUtils.getIf(editor, p.slice(0, splitPath.length), editor.schema)
    const innerChildren = innerParent ? ((innerParent as any).children ?? []) : []
    p[splitPath.length] = resolveSegmentIndex(innerChildren, p[splitPath.length]!) - position
  }

  return p
}

/**
 * Transform a point for a split_node operation.
 *
 * If the point is inside the split node and at or after the split position,
 * it moves into the new node with an adjusted offset.
 */
function transformPointForSplit(
  editor: Editor,
  point: Point,
  splitPath: Path,
  position: number,
  affinity: 'forward' | 'backward' = 'forward',
): Point | null {
  let {path, offset} = point

  if (Path.equals(splitPath, path)) {
    if (position < offset || (position === offset && affinity === 'forward')) {
      offset -= position
      path = transformPathForSplit(editor, path, splitPath, position, 'forward')!
    }
  } else {
    path = transformPathForSplit(editor, path, splitPath, position, affinity)!
  }

  return {path, offset}
}
