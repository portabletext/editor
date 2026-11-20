import {isSpan, isTextBlock} from '@portabletext/schema'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import type {InsertOperation} from '../engine/interfaces/operation'
import type {Path} from '../engine/interfaces/path'
import type {Point} from '../engine/interfaces/point'
import {isAncestorPath} from '../engine/path/is-ancestor-path'
import {pathEquals} from '../engine/path/path-equals'
import {isBackwardRange} from '../engine/range/is-backward-range'
import {getNode} from '../traversal/get-node'
import {getSibling} from '../traversal/get-sibling'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Merge a node at the given path into its previous sibling using only
 * patch-compliant operations (insert.text/insert + unset).
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
  editor: PortableTextEditorEngine,
  path: Path,
  position: number,
): void {
  const nodeEntry = getNode(editor.snapshot, path)

  if (!nodeEntry) {
    return
  }

  const node = nodeEntry.node
  const prevSibling = getSibling(editor.snapshot, path, {direction: 'previous'})

  if (!prevSibling) {
    return
  }

  const prevPath = prevSibling.path
  const prevKey = prevSibling.node._key ?? ''

  // Pre-transform all refs with merge semantics
  for (const ref of editor.pathRefs) {
    const current = ref.current
    if (current) {
      ref.current = transformPathForMerge(current, path, prevKey, position)
    }
  }
  for (const ref of editor.pointRefs) {
    const current = ref.current
    if (current) {
      ref.current = transformPointForMerge(current, path, prevKey, position)
    }
  }
  for (const ref of editor.rangeRefs) {
    const current = ref.current
    if (current) {
      const anchor = transformPointForMerge(
        current.anchor,
        path,
        prevKey,
        position,
      )
      const focus = transformPointForMerge(
        current.focus,
        path,
        prevKey,
        position,
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
  if (editor.snapshot.context.selection) {
    const anchor = transformPointForMerge(
      editor.snapshot.context.selection.anchor,
      path,
      prevKey,
      position,
    )
    const focus = transformPointForMerge(
      editor.snapshot.context.selection.focus,
      path,
      prevKey,
      position,
    )
    if (anchor && focus) {
      editor.snapshot.context.selection = {
        anchor,
        focus,
        backward: isBackwardRange({anchor, focus}, editor.snapshot.context),
      }
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
  const savedSelection = editor.snapshot.context.selection

  try {
    withoutNormalizing(editor, () => {
      if (isSpan({schema: editor.snapshot.context.schema}, node)) {
        // Merge text: insert the text into the previous sibling at the position
        if (node.text.length > 0) {
          editor.apply({
            type: 'insert.text',
            path: prevPath,
            offset: position,
            text: node.text,
          })
        }
        // Remove the now-redundant text node
        editor.apply({
          type: 'unset',
          path,
        })
      } else if (isTextBlock({schema: editor.snapshot.context.schema}, node)) {
        // Merge element: move all children into the previous sibling
        const prevEntry = getNode(editor.snapshot, prevPath)
        if (
          !prevEntry ||
          !isTextBlock({schema: editor.snapshot.context.schema}, prevEntry.node)
        ) {
          return
        }
        const prevChildren = prevEntry.node.children
        let lastInsertedKey: string | undefined =
          prevChildren.length > 0
            ? prevChildren[prevChildren.length - 1]!._key
            : undefined

        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i]!
          const operation: InsertOperation =
            lastInsertedKey !== undefined
              ? {
                  type: 'insert',
                  path: [...prevPath, 'children', {_key: lastInsertedKey}],
                  node: child,
                  position: 'after',
                }
              : {
                  type: 'insert',
                  path: [...prevPath, 'children', 0],
                  node: child,
                  position: 'before',
                }
          editor.apply(operation)
          // The engine's collision backstop re-mints `operation.node._key`
          // in place when it collides with an existing sibling, so the next
          // anchor has to read the post-apply key, not `child._key`.
          lastInsertedKey = operation.node._key
        }
        // Remove the now-empty element
        editor.apply({
          type: 'unset',
          path,
        })
      }
    })
  } finally {
    // Restore pre-transformed selection
    editor.snapshot.context.selection = savedSelection

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
  }
}

/**
 * Transform a path for a merge_node operation with keyed paths.
 *
 * When a node at `mergePath` is merged into its previous sibling:
 * - The merged node disappears
 * - Children of the merged node move into the previous sibling
 * - Paths referencing the merged node or its descendants get the
 *   previous sibling's key substituted
 */
function transformPathForMerge(
  path: Path,
  mergePath: Path,
  prevKey: string,
  _position: number,
): Path | null {
  const p = [...path]

  if (pathEquals(mergePath, p)) {
    for (let i = p.length - 1; i >= 0; i--) {
      if (isKeyedSegment(p[i])) {
        p[i] = {_key: prevKey}
        break
      }
    }
  } else if (isAncestorPath(mergePath, p)) {
    for (let i = mergePath.length - 1; i >= 0; i--) {
      if (isKeyedSegment(p[i])) {
        p[i] = {_key: prevKey}
        break
      }
    }
  }

  return p
}

/**
 * Transform a point for a merge_node operation with keyed paths.
 *
 * If the point is inside the merged node, its offset shifts by `position`
 * (the number of characters already in the merge target for span merges).
 */
function transformPointForMerge(
  point: Point,
  mergePath: Path,
  prevKey: string,
  position: number,
): Point {
  let {path, offset} = point

  if (pathEquals(mergePath, path)) {
    offset += position
  }

  path = transformPathForMerge(path, mergePath, prevKey, position)!

  return {path, offset}
}
