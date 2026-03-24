import {isSpan} from '@portabletext/schema'
import {getAncestorTextBlock} from '../../../node-traversal/get-ancestor-text-block'
import {getNodes} from '../../../node-traversal/get-nodes'
import {getSpanNode} from '../../../node-traversal/get-span-node'
import {hasNode} from '../../../node-traversal/has-node'
import {after} from '../../editor/after'
import type {Editor} from '../../interfaces/editor'
import type {Operation} from '../../interfaces/operation'
import type {Path} from '../../interfaces/path'
import type {Point} from '../../interfaces/point'
import type {Range} from '../../interfaces/range'
import {isDescendantPath} from '../../path/is-descendant-path'
import {nextPath as getNextPath} from '../../path/next-path'
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

/**
 * Check whether a text diff was applied in a way we can perform the pending action on /
 * recover the pending selection.
 */
export function verifyDiffState(editor: Editor, textDiff: TextDiff): boolean {
  const {path, diff} = textDiff
  if (!hasNode(editor, path)) {
    return false
  }

  const nodeEntry = getSpanNode(editor, path)
  if (!nodeEntry) {
    return false
  }
  const node = nodeEntry.node

  if (diff.start !== node.text.length || diff.text.length === 0) {
    return (
      node.text.slice(diff.start, diff.start + diff.text.length) === diff.text
    )
  }

  const nextPath = getNextPath(path)
  if (!hasNode(editor, nextPath)) {
    return false
  }

  const nextNodeEntry = getSpanNode(editor, nextPath)
  return !!nextNodeEntry && nextNodeEntry.node.text.startsWith(diff.text)
}

export function applyStringDiff(text: string, ...diffs: StringDiff[]) {
  return diffs.reduce(
    (text, diff) =>
      text.slice(0, diff.start) + diff.text + text.slice(diff.end),
    text,
  )
}

function longestCommonPrefixLength(str: string, another: string) {
  const length = Math.min(str.length, another.length)

  for (let i = 0; i < length; i++) {
    if (str.charAt(i) !== another.charAt(i)) {
      return i
    }
  }

  return length
}

function longestCommonSuffixLength(
  str: string,
  another: string,
  max: number,
): number {
  const length = Math.min(str.length, another.length, max)

  for (let i = 0; i < length; i++) {
    if (
      str.charAt(str.length - i - 1) !== another.charAt(another.length - i - 1)
    ) {
      return i
    }
  }

  return length
}

/**
 * Remove redundant changes from the diff so that it spans the minimal possible range
 */
export function normalizeStringDiff(targetText: string, diff: StringDiff) {
  const {start, end, text} = diff
  const removedText = targetText.slice(start, end)

  const prefixLength = longestCommonPrefixLength(removedText, text)
  const max = Math.min(
    removedText.length - prefixLength,
    text.length - prefixLength,
  )
  const suffixLength = longestCommonSuffixLength(removedText, text, max)

  const normalized: StringDiff = {
    start: start + prefixLength,
    end: end - suffixLength,
    text: text.slice(prefixLength, text.length - suffixLength),
  }

  if (normalized.start === normalized.end && normalized.text.length === 0) {
    return null
  }

  return normalized
}

/**
 * Return a string diff that is equivalent to applying b after a spanning the range of
 * both changes
 */
export function mergeStringDiffs(
  targetText: string,
  a: StringDiff,
  b: StringDiff,
): StringDiff | null {
  const start = Math.min(a.start, b.start)
  const overlap = Math.max(
    0,
    Math.min(a.start + a.text.length, b.end) - b.start,
  )

  const applied = applyStringDiff(targetText, a, b)
  const sliceEnd = Math.max(
    b.start + b.text.length,
    a.start +
      a.text.length +
      (a.start + a.text.length > b.start ? b.text.length : 0) -
      overlap,
  )

  const text = applied.slice(start, sliceEnd)
  const end = Math.max(a.end, b.end - a.text.length + (a.end - a.start))
  return normalizeStringDiff(targetText, {start, end, text})
}

/**
 * Get the slate range the text diff spans.
 */
export function targetRange(textDiff: TextDiff): Range {
  const {path, diff} = textDiff
  return {
    anchor: {path, offset: diff.start},
    focus: {path, offset: diff.end},
  }
}

/**
 * Normalize a 'pending point' a.k.a a point based on the dom state before applying
 * the pending diffs. Since the pending diffs might have been inserted with different
 * marks we have to 'walk' the offset from the starting position to ensure we still
 * have a valid point inside the document
 */
export function normalizePoint(editor: Editor, point: Point): Point | null {
  let {path, offset} = point
  if (!hasNode(editor, path)) {
    return null
  }

  const leafEntry = getSpanNode(editor, path)
  if (!leafEntry) {
    return null
  }
  let leaf = leafEntry.node

  const parentBlock = getAncestorTextBlock(editor, path)

  if (!parentBlock) {
    return null
  }

  while (offset > leaf.text.length) {
    const afterPoint = after(editor, path)
    const [nextEntry] = afterPoint
      ? getNodes(editor, {
          from: afterPoint.path,
          match: (n) => isSpan({schema: editor.schema}, n),
        })
      : []
    if (
      !nextEntry ||
      !isSpan({schema: editor.schema}, nextEntry.node) ||
      !isDescendantPath(nextEntry.path, parentBlock.path)
    ) {
      return null
    }

    offset -= leaf.text.length
    leaf = nextEntry.node
    path = nextEntry.path
  }

  return {path, offset}
}

/**
 * Normalize a 'pending selection' to ensure it's valid in the current document state.
 */
export function normalizeRange(editor: Editor, range: Range): Range | null {
  const anchor = normalizePoint(editor, range.anchor)
  if (!anchor) {
    return null
  }

  if (isCollapsedRange(range)) {
    return {anchor, focus: anchor}
  }

  const focus = normalizePoint(editor, range.focus)
  if (!focus) {
    return null
  }

  return {anchor, focus}
}

export function transformPendingPoint(
  editor: Editor,
  point: Point,
  op: Operation,
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
  op: Operation,
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
  op: Operation,
): TextDiff | null {
  const {path, diff, id} = textDiff

  switch (op.type) {
    case 'insert_text': {
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
    case 'remove_text': {
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
