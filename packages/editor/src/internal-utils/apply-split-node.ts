import {isSpan, isTextBlock} from '@portabletext/schema'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import type {Point} from '../slate/interfaces/point'
import {getNode} from '../slate/node/get-node'
import {isAncestorPath} from '../slate/path/is-ancestor-path'
import {nextPath} from '../slate/path/next-path'
import {pathEndsBefore} from '../slate/path/path-ends-before'
import {pathEquals} from '../slate/path/path-equals'
import {isAfterPoint} from '../slate/point/is-after-point'
import {pointEquals} from '../slate/point/point-equals'
import {isRange} from '../slate/range/is-range'
import type {PortableTextSlateEditor} from '../types/slate-editor'
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
  const node = getNode(editor, path, editor.schema)

  // Pre-transform all refs with split semantics
  for (const ref of editor.pathRefs) {
    const current = ref.current
    if (current) {
      ref.current = transformPathForSplit(
        current,
        path,
        position,
        ref.affinity ?? 'forward',
      )
    }
  }
  for (const ref of editor.pointRefs) {
    const current = ref.current
    if (current) {
      ref.current = transformPointForSplit(
        current,
        path,
        position,
        ref.affinity ?? 'forward',
      )
    }
  }
  for (const ref of editor.rangeRefs) {
    const current = ref.current
    if (current) {
      const [anchorAffinity, focusAffinity] = rangeRefAffinities(
        current,
        ref.affinity,
      )
      const anchor = transformPointForSplit(
        current.anchor,
        path,
        position,
        anchorAffinity ?? 'forward',
      )
      const focus = transformPointForSplit(
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
      editor.selection.anchor,
      path,
      position,
      'forward',
    )
    const focus = transformPointForSplit(
      editor.selection.focus,
      path,
      position,
      'forward',
    )
    if (anchor && focus) {
      editor.selection = {anchor, focus}
    }
  }

  // Pre-transform decoratedRanges with inward affinity: end point uses
  // 'backward' so the range doesn't expand at the split boundary, start
  // point uses 'forward' so it moves to the new node when exactly at the
  // split position.
  editor.decoratedRanges = editor.decoratedRanges.map((dr) => {
    if (!isRange(dr)) return dr

    const isCollapsed = pointEquals(dr.anchor, dr.focus)
    const anchorIsEnd = !isCollapsed && isAfterPoint(dr.anchor, dr.focus)
    const focusIsEnd = !isCollapsed && !anchorIsEnd

    const newAnchor = transformPointForSplit(
      dr.anchor,
      path,
      position,
      anchorIsEnd ? 'backward' : 'forward',
    )
    const newFocus = transformPointForSplit(
      dr.focus,
      path,
      position,
      focusIsEnd ? 'backward' : 'forward',
    )

    if (
      newAnchor &&
      newFocus &&
      (!pointEquals(newAnchor, dr.anchor) || !pointEquals(newFocus, dr.focus))
    ) {
      return {...dr, anchor: newAnchor, focus: newFocus}
    }

    return dr
  })

  editor._suppressDecorationSendBack++

  // Temporarily remove all refs so the decomposed operations don't
  // double-transform them
  const pathRefs = new Set(editor.pathRefs)
  const pointRefs = new Set(editor.pointRefs)
  const rangeRefs = new Set(editor.rangeRefs)
  editor.pathRefs.clear()
  editor.pointRefs.clear()
  editor.rangeRefs.clear()

  // Save the pre-transformed selection so decomposed operations don't
  // double-transform it
  const savedSelection = editor.selection

  try {
    withoutNormalizing(editor, () => {
      if (isSpan({schema: editor.schema}, node)) {
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
          path: nextPath(path),
          node: newNode,
        })
      } else if (isTextBlock({schema: editor.schema}, node)) {
        const children = node.children
        const afterChildren = children.slice(position)
        const newNode = {...properties, children: afterChildren} as Node

        for (let i = children.length - 1; i >= position; i--) {
          editor.apply({
            type: 'remove_node',
            path: [...path, i],
            node: children[i]!,
          })
        }
        editor.apply({
          type: 'insert_node',
          path: nextPath(path),
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
      editor.pathRefs.add(ref)
    }
    for (const ref of pointRefs) {
      editor.pointRefs.add(ref)
    }
    for (const ref of rangeRefs) {
      editor.rangeRefs.add(ref)
    }

    editor._suppressDecorationSendBack--
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
  path: Path,
  splitPath: Path,
  position: number,
  affinity: 'forward' | 'backward' = 'forward',
): Path | null {
  const p = [...path]

  if (pathEquals(splitPath, p)) {
    if (affinity === 'forward') {
      p[p.length - 1] = p[p.length - 1]! + 1
    }
    // backward: no change
  } else if (pathEndsBefore(splitPath, p)) {
    p[splitPath.length - 1] = p[splitPath.length - 1]! + 1
  } else if (
    isAncestorPath(splitPath, p) &&
    path[splitPath.length]! >= position
  ) {
    p[splitPath.length - 1] = p[splitPath.length - 1]! + 1
    p[splitPath.length] = p[splitPath.length]! - position
  }

  return p
}

/**
 * Transform a point for a split_node operation.
 *
 * If the point is inside the split node and at or after the split position,
 * it moves into the new node with an adjusted offset.
 */
export function transformPointForSplit(
  point: Point,
  splitPath: Path,
  position: number,
  affinity: 'forward' | 'backward' = 'forward',
): Point | null {
  let {path, offset} = point

  if (pathEquals(splitPath, path)) {
    if (position < offset || (position === offset && affinity === 'forward')) {
      offset -= position
      path = transformPathForSplit(path, splitPath, position, 'forward')!
    }
  } else {
    path = transformPathForSplit(path, splitPath, position, affinity)!
  }

  return {path, offset}
}
