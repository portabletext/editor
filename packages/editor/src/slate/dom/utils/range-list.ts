import {isTextBlock} from '@portabletext/schema'
import {isEditor} from '../../editor/is-editor'
import {range as editorRange} from '../../editor/range'
import type {Editor} from '../../interfaces/editor'
import type {Node} from '../../interfaces/node'
import type {Path} from '../../interfaces/path'
import type {Range} from '../../interfaces/range'
import type {DecoratedRange} from '../../interfaces/text'
import {rangeEdges} from '../../range/range-edges'
import {rangeEquals} from '../../range/range-equals'
import {rangeIntersection} from '../../range/range-intersection'

const shallowCompare = (
  obj1: {[key: string]: unknown},
  obj2: {[key: string]: unknown},
) =>
  Object.keys(obj1).length === Object.keys(obj2).length &&
  Object.keys(obj1).every(
    (key) => obj2.hasOwnProperty(key) && obj1[key] === obj2[key],
  )

const isDecorationFlagsEqual = (range: Range, other: Range) => {
  const {anchor: _rangeAnchor, focus: _rangeFocus, ...rangeOwnProps} = range
  const {anchor: _otherAnchor, focus: _otherFocus, ...otherOwnProps} = other

  return shallowCompare(rangeOwnProps, otherOwnProps)
}

/**
 * Check if a list of decorator ranges are equal to another.
 *
 * PERF: this requires the two lists to also have the ranges inside them in the
 * same order, but this is an okay constraint for us since decorations are
 * kept in order, and the odd case where they aren't is okay to re-render for.
 */

export const isElementDecorationsEqual = (
  list: Range[] | null,
  another: Range[] | null,
): boolean => {
  if (list === another) {
    return true
  }

  if (!list || !another) {
    return false
  }

  if (list.length !== another.length) {
    return false
  }

  for (let i = 0; i < list.length; i++) {
    const range = list[i]!
    const other = another[i]!

    if (!rangeEquals(range, other) || !isDecorationFlagsEqual(range, other)) {
      return false
    }
  }

  return true
}

/**
 * Check if a list of decorator ranges are equal to another.
 *
 * PERF: this requires the two lists to also have the ranges inside them in the
 * same order, but this is an okay constraint for us since decorations are
 * kept in order, and the odd case where they aren't is okay to re-render for.
 */

export const isTextDecorationsEqual = (
  list: Range[] | null,
  another: Range[] | null,
): boolean => {
  if (list === another) {
    return true
  }

  if (!list || !another) {
    return false
  }

  if (list.length !== another.length) {
    return false
  }

  for (let i = 0; i < list.length; i++) {
    const range = list[i]!
    const other = another[i]!

    // compare only offsets because paths doesn't matter for text
    if (
      range.anchor.offset !== other.anchor.offset ||
      range.focus.offset !== other.focus.offset ||
      !isDecorationFlagsEqual(range, other)
    ) {
      return false
    }
  }

  return true
}

/**
 * Split and group decorations by each child of a node.
 *
 * @returns An array with length equal to that of `node.children`. Each index
 * corresponds to a child of `node`, and the value is an array of decorations
 * for that child.
 */

export const splitDecorationsByChild = (
  editor: Editor,
  node: Editor | Node,
  path: Path,
  decorations: DecoratedRange[],
): DecoratedRange[][] => {
  const children: readonly unknown[] = isEditor(node)
    ? node.children
    : isTextBlock({schema: editor.schema}, node)
      ? node.children
      : []
  const decorationsByChild = Array.from(children, (): DecoratedRange[] => [])

  if (decorations.length === 0) {
    return decorationsByChild
  }
  const level = path.length
  const ancestorRange = editorRange(editor, path)

  const cachedChildRanges = new Array<Range | undefined>(children.length)

  const getChildRange = (index: number) => {
    const cachedRange = cachedChildRanges[index]
    if (cachedRange) {
      return cachedRange
    }
    const child = children[index] as Node | undefined
    if (!child) {
      return undefined
    }
    const childPath: Path =
      path.length === 0
        ? [{_key: child._key}]
        : [...path, 'children', {_key: child._key}]
    const childRange = editorRange(editor, childPath)
    cachedChildRanges[index] = childRange
    return childRange
  }

  const keyToIndex = new Map<string, number>()
  for (let i = 0; i < children.length; i++) {
    const child = children[i] as Node | undefined
    if (child) {
      keyToIndex.set(child._key, i)
    }
  }

  const resolveChildIndex = (point: {path: Path}): number | undefined => {
    // For root (level=0), child key is at path[0] (no field name prefix)
    // For non-root (level>0), child key is at path[level+1] (after field name at path[level])
    const childSegmentIndex = level === 0 ? 0 : level + 1
    const segment = point.path[childSegmentIndex]
    if (segment && typeof segment === 'object' && '_key' in segment) {
      return keyToIndex.get(segment._key)
    }
    return undefined
  }

  for (const decoration of decorations) {
    const decorationRange = rangeIntersection(ancestorRange, decoration)
    if (!decorationRange) {
      continue
    }

    const [startPoint, endPoint] = rangeEdges(decorationRange, {}, editor)
    const startIndex = resolveChildIndex(startPoint) ?? 0
    const endIndex = resolveChildIndex(endPoint) ?? children.length - 1

    for (let i = startIndex; i <= endIndex; i++) {
      const ds = decorationsByChild[i]
      if (!ds) {
        continue
      }

      const childRange = getChildRange(i)
      if (!childRange) {
        continue
      }
      const childDecorationRange = rangeIntersection(childRange, decoration)
      if (!childDecorationRange) {
        continue
      }

      ds.push({
        ...decoration,
        ...childDecorationRange,
      })
    }
  }

  return decorationsByChild
}
