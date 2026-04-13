import {isSpan, isTextBlock} from '@portabletext/schema'
import {getNode} from '../node-traversal/get-node'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import type {Point} from '../slate/interfaces/point'
import {isAncestorPath} from '../slate/path/is-ancestor-path'
import {pathEquals} from '../slate/path/path-equals'
import {isBackwardRange} from '../slate/range/is-backward-range'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {rangeRefAffinities} from './range-ref-affinities'

/**
 * Split a node at the given path and position using only patch-compliant
 * operations (remove_text/unset + insert).
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
): void {
  const nodeEntry = getNode(editor, path)

  if (!nodeEntry) {
    return
  }

  const node = nodeEntry.node

  const newKey = editor.keyGenerator()

  // Collect the keys of children that will move to the new node.
  // For block splits, children at index >= position move.
  // For span splits, this is empty (text splits don't move child nodes).
  const movedChildKeys = new Set<string>()
  if (isTextBlock({schema: editor.schema}, node)) {
    for (let i = position; i < node.children.length; i++) {
      movedChildKeys.add(node.children[i]!._key)
    }
  }

  // Pre-transform all refs with split semantics
  for (const ref of editor.pathRefs) {
    const current = ref.current
    if (current) {
      ref.current = transformPathForSplit(
        current,
        path,
        newKey,
        movedChildKeys,
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
        newKey,
        movedChildKeys,
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
        newKey,
        movedChildKeys,
        anchorAffinity ?? 'forward',
      )
      const focus = transformPointForSplit(
        current.focus,
        path,
        position,
        newKey,
        movedChildKeys,
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
      newKey,
      movedChildKeys,
      'forward',
    )
    const focus = transformPointForSplit(
      editor.selection.focus,
      path,
      position,
      newKey,
      movedChildKeys,
      'forward',
    )
    if (anchor && focus) {
      editor.selection = {
        anchor,
        focus,
        backward: isBackwardRange({anchor, focus}, editor),
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

  // Save the pre-transformed selection so decomposed operations don't
  // double-transform it
  const savedSelection = editor.selection

  try {
    withoutNormalizing(editor, () => {
      if (isSpan({schema: editor.schema}, node)) {
        const {text: _text, ...properties} = node
        const afterText = node.text.slice(position)
        const newNode = {...properties, _key: newKey, text: afterText} as Node
        editor.apply({
          type: 'remove_text',
          path,
          offset: position,
          text: afterText,
        })
        editor.apply({
          type: 'insert',
          path,
          node: newNode,
          position: 'after',
        })
      } else if (isTextBlock({schema: editor.schema}, node)) {
        const {children: _children, ...properties} = node
        const children = node.children
        const afterChildren = children.slice(position)
        const newNode = {
          ...properties,
          _key: newKey,
          children: afterChildren,
        } as Node

        for (let i = children.length - 1; i >= position; i--) {
          editor.apply({
            type: 'unset',
            path: [...path, 'children', {_key: children[i]!._key}],
          })
        }
        editor.apply({
          type: 'insert',
          path,
          node: newNode,
          position: 'after',
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
  }
}

/**
 * Transform a path for a split_node operation with keyed paths.
 *
 * When a node at splitPath is split:
 * - If the path equals the split path and affinity is 'forward', the path
 *   moves to the new node (key substitution).
 * - If the path is a descendant of the split node and the child at the
 *   boundary moved to the new node, the split node's key is substituted.
 */
function transformPathForSplit(
  path: Path,
  splitPath: Path,
  newKey: string,
  movedChildKeys: Set<string>,
  affinity: 'forward' | 'backward' = 'forward',
): Path | null {
  const p = [...path]

  if (pathEquals(splitPath, p)) {
    if (affinity === 'forward') {
      for (let i = p.length - 1; i >= 0; i--) {
        if (isKeyedSegment(p[i])) {
          p[i] = {_key: newKey}
          break
        }
      }
    }
    // backward: no change
  } else if (isAncestorPath(splitPath, p)) {
    // Descendant of the split node. Check if the immediate child
    // referenced by this path moved to the new node.
    // Walk past the splitPath prefix and any field name strings to find
    // the first keyed segment that identifies the child.
    for (let i = splitPath.length; i < p.length; i++) {
      const segment = p[i]
      if (typeof segment === 'string') {
        continue
      }
      if (isKeyedSegment(segment) && movedChildKeys.has(segment._key)) {
        // This child moved to the new node. Replace the split node's
        // key segment with the new key.
        for (let j = splitPath.length - 1; j >= 0; j--) {
          if (isKeyedSegment(p[j])) {
            p[j] = {_key: newKey}
            break
          }
        }
      }
      break
    }
  }

  return p
}

/**
 * Transform a point for a split_node operation with keyed paths.
 *
 * If the point is inside the split node and at or after the split position,
 * it moves into the new node with an adjusted offset.
 */
function transformPointForSplit(
  point: Point,
  splitPath: Path,
  position: number,
  newKey: string,
  movedChildKeys: Set<string>,
  affinity: 'forward' | 'backward' = 'forward',
): Point | null {
  let {path, offset} = point

  if (pathEquals(splitPath, path)) {
    if (position < offset || (position === offset && affinity === 'forward')) {
      offset -= position
      path = transformPathForSplit(
        path,
        splitPath,
        newKey,
        movedChildKeys,
        'forward',
      )!
    }
  } else {
    path = transformPathForSplit(
      path,
      splitPath,
      newKey,
      movedChildKeys,
      affinity,
    )!
  }

  return {path, offset}
}
