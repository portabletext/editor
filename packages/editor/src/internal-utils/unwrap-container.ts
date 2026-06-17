import type {Path} from '../engine/interfaces/path'
import type {Point} from '../engine/interfaces/point'
import {isAncestorPath} from '../engine/path/is-ancestor-path'
import {getChildrenAt} from '../traversal/get-children'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {getUnwrapTarget} from './get-unwrap-target'

/**
 * Move every child of an empty editable container at `originPath` to
 * be a sibling at the level where they're accepted, unsetting every
 * container along the way.
 *
 * The unwrap target is computed by {@link getUnwrapTarget}: if the
 * origin's parent's field accepts the children, only the origin is
 * unset; otherwise the operation walks up until it finds an accepting
 * level, or no-ops if the path is blocked by a non-lonely level or by
 * a payload type that root doesn't accept.
 *
 * `position: 'before'` lands the children before the unwrap target at
 * the parent level; `'after'` lands them after.
 *
 * Selection follows: any point that pointed inside the origin is
 * rewritten to point at the same node at its new sibling location.
 * Points outside the origin are left alone.
 */
export function unwrapContainer(
  editor: PortableTextEditorEngine,
  originPath: Path,
  position: 'before' | 'after',
): void {
  const children = getChildrenAt(editor.snapshot, originPath)
  if (children.length === 0) {
    editor.apply({type: 'unset', path: originPath})
    return
  }

  const payloadTypes = new Set(children.map((child) => child.node._type))
  const unwrapTarget = getUnwrapTarget(
    editor.snapshot,
    originPath,
    payloadTypes,
  )
  if (!unwrapTarget) {
    return
  }

  // `children[0].path` resolves to e.g. `[...originPath, fieldName, {_key}]`,
  // giving us the field name without re-resolving the container.
  const innerPrefix = children[0]!.path.slice(0, originPath.length + 1)
  const previousSelection = editor.snapshot.context.selection

  // Repeated `position: 'before'` against the same path inserts in
  // reverse, so iterate backward; `'after'` is symmetric.
  const order = position === 'before' ? [...children].reverse() : children
  for (const child of order) {
    editor.apply({
      type: 'insert',
      path: unwrapTarget,
      node: child.node,
      position,
    })
  }
  editor.apply({type: 'unset', path: unwrapTarget})

  if (previousSelection) {
    const anchor = transformPoint(previousSelection.anchor, innerPrefix)
    const focus = transformPoint(previousSelection.focus, innerPrefix)
    editor.apply({
      type: 'set.selection',
      properties: editor.snapshot.context.selection,
      newProperties: {anchor, focus},
    })
  }
}

/**
 * If `point` is inside the origin (its path starts with `innerPrefix`),
 * strip the prefix so the point now refers to the same node at its new
 * sibling location. Otherwise return `point` unchanged.
 */
function transformPoint(point: Point, innerPrefix: Path): Point {
  if (!isAncestorPath(innerPrefix, point.path)) {
    return point
  }
  return {
    path: point.path.slice(innerPrefix.length),
    offset: point.offset,
  }
}
