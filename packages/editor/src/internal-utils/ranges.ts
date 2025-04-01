import {Point, type Editor, type Operation, type Range} from 'slate'
import type {EditorSelection} from '../types/editor'
import {toSlatePath} from './paths'

export interface ObjectWithKeyAndType {
  _key: string
  _type: string
  children?: ObjectWithKeyAndType[]
}

export function toSlateRange(
  selection: EditorSelection,
  editor: Editor,
): Range | null {
  if (!selection || !editor) {
    return null
  }
  const anchor = {
    path: toSlatePath(selection.anchor.path, editor),
    offset: selection.anchor.offset,
  }
  const focus = {
    path: toSlatePath(selection.focus.path, editor),
    offset: selection.focus.offset,
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
