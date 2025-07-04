import {Point, type Operation, type Range} from 'slate'
import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import {toSlatePath} from './paths'

export function toSlateRange(
  snapshot: {
    context: Pick<EditorContext, 'schema' | 'value' | 'selection'>
  } & Pick<EditorSnapshot, 'blockIndexMap'>,
): Range | null {
  if (!snapshot.context.selection) {
    return null
  }

  const anchor = {
    path: toSlatePath(snapshot, snapshot.context.selection.anchor.path),
    offset: snapshot.context.selection.anchor.offset,
  }
  const focus = {
    path: toSlatePath(snapshot, snapshot.context.selection.focus.path),
    offset: snapshot.context.selection.focus.offset,
  }

  if (focus.path.length === 0 || anchor.path.length === 0) {
    return null
  }

  const range = anchor && focus ? {anchor, focus} : null

  return range
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
