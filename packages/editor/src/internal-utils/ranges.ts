import {Point, type Operation, type Range} from 'slate'
import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import {isSpan} from './parse-blocks'
import {toSlatePath} from './paths'

export function toSlateRange(
  snapshot: {
    context: Pick<EditorContext, 'schema' | 'value' | 'selection'>
  } & Pick<EditorSnapshot, 'blockIndexMap'>,
): Range | null {
  if (!snapshot.context.selection) {
    return null
  }

  const anchorPath = toSlatePath(
    snapshot,
    snapshot.context.selection.anchor.path,
  )
  const focusPath = toSlatePath(snapshot, snapshot.context.selection.focus.path)

  if (anchorPath.path.length === 0 || focusPath.path.length === 0) {
    return null
  }

  const anchorOffset = anchorPath.child
    ? isSpan(snapshot.context, anchorPath.child)
      ? Math.min(
          anchorPath.child.text.length,
          snapshot.context.selection.anchor.offset,
        )
      : 0
    : 0
  const focusOffset = focusPath.child
    ? isSpan(snapshot.context, focusPath.child)
      ? Math.min(
          focusPath.child.text.length,
          snapshot.context.selection.focus.offset,
        )
      : 0
    : 0

  return {
    anchor: {
      path: anchorPath.path,
      offset: anchorOffset,
    },
    focus: {
      path: focusPath.path,
      offset: focusOffset,
    },
  }
}

export function moveRangeByOperation(
  range: Range,
  operation: Operation,
): Range | null {
  const anchor = Point.transform(range.anchor, operation)
  const focus = Point.transform(range.focus, operation)

  if (anchor === null || focus === null) {
    return null
  }

  if (Point.equals(anchor, range.anchor) && Point.equals(focus, range.focus)) {
    return range
  }

  return {anchor, focus}
}
