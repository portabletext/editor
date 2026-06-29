import type {Editor} from '../../interfaces/editor'
import type {EngineOperation} from '../../interfaces/operation'
import type {Path} from '../../interfaces/path'
import type {Point} from '../../interfaces/point'
import type {Range} from '../../interfaces/range'
import {pathEquals} from '../../path/path-equals'
import {transformPath} from '../../path/transform-path'
import {transformPoint} from '../../point/transform-point'
import {isCollapsedRange} from '../../range/is-collapsed-range'

export type StringDiff = {
  start: number
  end: number
  text: string
}

export type TextDiff = {
  id: number
  path: Path
  diff: StringDiff
}

export function transformPendingPoint(
  editor: Editor,
  point: Point,
  op: EngineOperation,
): Point | null {
  const pendingDiffs = editor.pendingDiffs
  const textDiff = pendingDiffs?.find(({path}) => pathEquals(path, point.path))

  if (!textDiff || point.offset <= textDiff.diff.start) {
    return transformPoint(point, op, {affinity: 'backward'})
  }

  const {diff} = textDiff
  // Point references location inside the diff => transform the point based on the location
  // the diff will be applied to and add the offset inside the diff.
  if (point.offset <= diff.start + diff.text.length) {
    const anchor = {path: point.path, offset: diff.start}
    const transformed = transformPoint(anchor, op, {
      affinity: 'backward',
    })

    if (!transformed) {
      return null
    }

    return {
      path: transformed.path,
      offset: transformed.offset + point.offset - diff.start,
    }
  }

  // Point references location after the diff
  const anchor = {
    path: point.path,
    offset: point.offset - diff.text.length + diff.end - diff.start,
  }
  const transformed = transformPoint(anchor, op, {
    affinity: 'backward',
  })
  if (!transformed) {
    return null
  }

  return {
    path: transformed.path,
    offset: transformed.offset + diff.text.length - diff.end + diff.start,
  }
}

export function transformPendingRange(
  editor: Editor,
  range: Range,
  op: EngineOperation,
): Range | null {
  const anchor = transformPendingPoint(editor, range.anchor, op)
  if (!anchor) {
    return null
  }

  if (isCollapsedRange(range)) {
    return {anchor, focus: anchor}
  }

  const focus = transformPendingPoint(editor, range.focus, op)
  if (!focus) {
    return null
  }

  return {anchor, focus}
}

export function transformTextDiff(
  textDiff: TextDiff,
  op: EngineOperation,
): TextDiff | null {
  const {path, diff, id} = textDiff

  switch (op.type) {
    case 'insert.text': {
      if (!pathEquals(op.path, path) || op.offset >= diff.end) {
        return textDiff
      }

      if (op.offset <= diff.start) {
        return {
          diff: {
            start: op.text.length + diff.start,
            end: op.text.length + diff.end,
            text: diff.text,
          },
          id,
          path,
        }
      }

      return {
        diff: {
          start: diff.start,
          end: diff.end + op.text.length,
          text: diff.text,
        },
        id,
        path,
      }
    }
    case 'remove.text': {
      if (!pathEquals(op.path, path) || op.offset >= diff.end) {
        return textDiff
      }

      if (op.offset + op.text.length <= diff.start) {
        return {
          diff: {
            start: diff.start - op.text.length,
            end: diff.end - op.text.length,
            text: diff.text,
          },
          id,
          path,
        }
      }

      return {
        diff: {
          start: diff.start,
          end: diff.end - op.text.length,
          text: diff.text,
        },
        id,
        path,
      }
    }
  }

  const newPath = transformPath(path, op)
  if (!newPath) {
    return null
  }

  return {
    diff,
    path: newPath,
    id,
  }
}
