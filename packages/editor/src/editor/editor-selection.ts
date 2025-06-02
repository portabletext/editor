import type {PortableTextBlock} from '@sanity/types'
import type {IndexedPath, KeyedPath} from '../types/paths'
import {isKeyedSegment, isTextBlock} from '../utils'
import type {EditorSchema} from './editor-schema'

/**
 * @public
 */
export type EditorSelection =
  | KeyedEditorSelection
  | IndexedEditorSelection
  | null

/**
 * @public
 */
export type EditorSelectionPoint =
  | IndexedEditorSelectionPoint
  | KeyedEditorSelectionPoint

/**********
 * Indexed Selection
 **********/

/**
 * @beta
 */
export type IndexedEditorSelection = {
  anchor: IndexedEditorSelectionPoint
  focus: IndexedEditorSelectionPoint
  backward?: undefined
}

/**
 * @beta
 */
export type IndexedEditorSelectionPoint = {
  path: IndexedPath
  offset: number
}

export function getIndexedSelection(
  schema: EditorSchema,
  value: Array<PortableTextBlock>,
  selection: EditorSelection,
): IndexedEditorSelection | null {
  if (!isIndexedSelection(selection)) {
    return selectionToIndexedSelection({
      schema,
      value,
      selection,
    })
  }

  return selection
}

export function isIndexedSelection(
  selection: EditorSelection,
): selection is IndexedEditorSelection {
  if (!selection) {
    return false
  }

  const anchorBlockPath = selection.anchor.path.at(0)
  const focusBlockPath = selection.focus.path.at(0)

  return (
    anchorBlockPath !== undefined &&
    typeof anchorBlockPath === 'number' &&
    focusBlockPath !== undefined &&
    typeof focusBlockPath === 'number'
  )
}

export function getIndexedSelectionPoint(
  schema: EditorSchema,
  value: Array<PortableTextBlock>,
  point: EditorSelectionPoint,
): IndexedEditorSelectionPoint | null {
  if (isIndexedSelectionPoint(point)) {
    return point
  }

  const indexedSelection = selectionToIndexedSelection({
    schema,
    value,
    selection: {
      anchor: point,
      focus: point,
    },
  })

  if (!indexedSelection) {
    return null
  }

  return indexedSelection.anchor
}

export function isIndexedSelectionPoint(
  point: EditorSelectionPoint,
): point is IndexedEditorSelectionPoint {
  return typeof point.path.at(0) === 'number'
}

export function isIndexedSelectionBackward(
  selection: IndexedEditorSelection,
): boolean {
  if (!selection) {
    return false
  }

  return isIndexedPointAfter(selection.anchor, selection.focus)
}

/**
 * Check if one indexed selection point is after another indexed selection
 * point
 */
export function isIndexedPointAfter(
  point: IndexedEditorSelectionPoint,
  another: IndexedEditorSelectionPoint,
): boolean {
  return comparePoints(point, another) === 'after'
}

/**
 * Check if one indexed selection point is before another indexed selection
 * point
 */
export function isIndexedPointBefore(
  point: IndexedEditorSelectionPoint,
  another: IndexedEditorSelectionPoint,
): boolean {
  return comparePoints(point, another) === 'before'
}

/**
 * Check if two indexed selection points are equal
 */
function pointEquals(
  point: IndexedEditorSelectionPoint,
  another: IndexedEditorSelectionPoint,
): boolean {
  return comparePoints(point, another) === 'equal'
}

export function selectionIncludesSelection(
  selectionA: IndexedEditorSelection,
  selectionB: IndexedEditorSelection,
): boolean {
  if (!selectionA || !selectionB) {
    return false
  }

  const startA = isIndexedSelectionBackward(selectionA)
    ? selectionA.focus
    : selectionA.anchor
  const endA = isIndexedSelectionBackward(selectionA)
    ? selectionA.anchor
    : selectionA.focus

  const startB = isIndexedSelectionBackward(selectionB)
    ? selectionB.focus
    : selectionB.anchor
  const endB = isIndexedSelectionBackward(selectionB)
    ? selectionB.anchor
    : selectionB.focus

  if (isIndexedPointBefore(endB, startA)) {
    return false
  }

  if (isIndexedPointAfter(startB, endA)) {
    return false
  }

  if (isExpanded(selectionB) && pointEquals(endB, startA)) {
    return false
  }

  if (isExpanded(selectionB) && pointEquals(startB, endA)) {
    return false
  }

  return true
}

function comparePoints(
  point: IndexedEditorSelectionPoint,
  another: IndexedEditorSelectionPoint,
): 'before' | 'equal' | 'after' {
  const comparison = comparePaths(point.path, another.path)

  if (comparison === 'equal') {
    if (point.offset < another.offset) {
      return 'before'
    }

    if (point.offset > another.offset) {
      return 'after'
    }

    return 'equal'
  }

  return comparison
}

function comparePaths(
  path: IndexedPath,
  another: IndexedPath,
): 'before' | 'equal' | 'after' {
  const min = Math.min(path.length, another.length)

  for (let i = 0; i < min; i++) {
    if (path[i] < another[i]) {
      return 'before'
    }

    if (path[i] > another[i]) {
      return 'after'
    }
  }

  return 'equal'
}

export function isIndexedSelectionCollapsed(
  selection: IndexedEditorSelection,
): boolean {
  if (!selection) {
    return false
  }

  return pointEquals(selection.anchor, selection.focus)
}

export function isExpanded(selection: IndexedEditorSelection): boolean {
  return !isIndexedSelectionCollapsed(selection)
}

/**
 * Turn an `EditorSelection` into an `IndexedEditorSelection`
 */
function selectionToIndexedSelection({
  schema,
  value,
  selection,
}: {
  schema: EditorSchema
  value: Array<PortableTextBlock>
  selection: EditorSelection
}): IndexedEditorSelection | null {
  if (!selection) {
    return null
  }

  const anchorBlockKey = isKeyedSegment(selection.anchor.path[0])
    ? selection.anchor.path[0]._key
    : undefined
  const focusBlockKey = isKeyedSegment(selection.focus.path[0])
    ? selection.focus.path[0]._key
    : undefined

  if (!anchorBlockKey || !focusBlockKey) {
    return null
  }

  let anchorBlockIndex: number | undefined = undefined
  let anchorBlock: PortableTextBlock | undefined
  let focusBlockIndex: number | undefined = undefined
  let focusBlock: PortableTextBlock | undefined

  for (let index = 0; index < value.length; index++) {
    const block = value[index]

    if (block._key === anchorBlockKey) {
      anchorBlockIndex = index
      anchorBlock = block
    }

    if (block._key === focusBlockKey) {
      focusBlockIndex = index
      focusBlock = block
    }
  }

  if (
    anchorBlockIndex === undefined ||
    !anchorBlock ||
    focusBlockIndex === undefined ||
    !focusBlock
  ) {
    return null
  }

  const indexedSelection: IndexedEditorSelection = {
    anchor: {
      path: [anchorBlockIndex],
      offset: selection.anchor.offset,
    },
    focus: {
      path: [focusBlockIndex],
      offset: selection.focus.offset,
    },
  }

  const anchorChildKey = isKeyedSegment(selection.anchor.path[2])
    ? selection.anchor.path[2]._key
    : undefined

  if (anchorChildKey && isTextBlock({schema}, anchorBlock)) {
    let childIndex = 0

    for (const child of anchorBlock.children) {
      if (child._key === anchorChildKey) {
        indexedSelection.anchor.path.push(childIndex)
        break
      }

      childIndex++
    }
  }

  const focusChildKey = isKeyedSegment(selection.focus.path[2])
    ? selection.focus.path[2]._key
    : undefined

  if (focusChildKey && isTextBlock({schema}, focusBlock)) {
    let childIndex = 0

    for (const child of focusBlock.children) {
      if (child._key === focusChildKey) {
        indexedSelection.focus.path.push(childIndex)
        break
      }

      childIndex++
    }
  }

  return indexedSelection
}

/**********
 * Keyed Selection
 **********/

export type KeyedEditorSelection = {
  anchor: KeyedEditorSelectionPoint
  focus: KeyedEditorSelectionPoint
  backward?: boolean
}

export type KeyedEditorSelectionPoint = {
  path: KeyedPath
  offset: number
}

export function getKeyedSelection(
  schema: EditorSchema,
  value: Array<PortableTextBlock>,
  selection: EditorSelection,
): KeyedEditorSelection | null {
  if (isKeyedSelection(selection)) {
    return selection
  }

  return selectionToKeyedSelection({
    schema,
    value,
    selection,
  })
}

export function isKeyedSelection(
  selection: EditorSelection,
): selection is KeyedEditorSelection {
  if (!selection) {
    return false
  }

  const anchorBlockPath = selection.anchor.path.at(0)
  const focusBlockPath = selection.focus.path.at(0)

  return isKeyedSegment(anchorBlockPath) && isKeyedSegment(focusBlockPath)
}

export function isKeyedSelectionPoint(
  point: EditorSelectionPoint,
): point is KeyedEditorSelectionPoint {
  return isKeyedSegment(point.path.at(0))
}

export function getKeyedSelectionPoint(
  schema: EditorSchema,
  value: Array<PortableTextBlock>,
  point: EditorSelectionPoint,
): KeyedEditorSelectionPoint | null {
  if (isIndexedSelectionPoint(point)) {
    const blockIndex = point.path.at(0)
    const childIndex = point.path.at(1)

    if (blockIndex === undefined) {
      return null
    }

    const block = value.at(blockIndex)

    if (!block) {
      return null
    }

    if (childIndex !== undefined && isTextBlock({schema}, block)) {
      const child = block.children.at(childIndex)

      if (child) {
        return {
          path: [{_key: block._key}, 'children', {_key: child._key}],
          offset: point.offset,
        }
      }
    }

    return {
      path: [{_key: block._key}],
      offset: point.offset,
    }
  }

  return point
}

/**
 * Turn an `IndexedEditorSelection` into a `KeyedEditorSelection`
 */
function selectionToKeyedSelection({
  schema,
  value,
  selection,
}: {
  schema: EditorSchema
  value: Array<PortableTextBlock>
  selection: EditorSelection
}): KeyedEditorSelection | null {
  if (!selection) {
    return null
  }

  const indexedAnchor = getIndexedSelectionPoint(
    schema,
    value,
    selection.anchor,
  )
  const indexedFocus = getIndexedSelectionPoint(schema, value, selection.focus)

  if (!indexedAnchor || !indexedFocus) {
    return null
  }

  const anchorBlockIndex = indexedAnchor.path.at(0)
  const anchorBlock =
    anchorBlockIndex !== undefined ? value.at(anchorBlockIndex) : undefined

  if (!anchorBlock) {
    return null
  }

  const focusBlockIndex = indexedFocus.path.at(0)
  const focusBlock =
    focusBlockIndex !== undefined ? value.at(focusBlockIndex) : undefined

  if (!focusBlock) {
    return null
  }

  const keyedSelection: KeyedEditorSelection = {
    anchor: {
      path: [{_key: anchorBlock._key}],
      offset: indexedAnchor.offset,
    },
    focus: {
      path: [{_key: focusBlock._key}],
      offset: indexedFocus.offset,
    },
    backward: isIndexedSelectionBackward({
      anchor: indexedAnchor,
      focus: indexedFocus,
    }),
  }

  const anchorChildIndex = indexedAnchor.path.at(1)
  const anchorChild =
    anchorChildIndex !== undefined && isTextBlock({schema}, anchorBlock)
      ? anchorBlock?.children.at(anchorChildIndex)
      : undefined

  if (anchorChild) {
    keyedSelection.anchor.path.push('children')
    keyedSelection.anchor.path.push({_key: anchorChild._key})
  }

  const focusChildIndex = indexedFocus.path.at(1)
  const focusChild =
    focusChildIndex !== undefined && isTextBlock({schema}, focusBlock)
      ? focusBlock?.children.at(focusChildIndex)
      : undefined

  if (focusChild) {
    keyedSelection.focus.path.push('children')
    keyedSelection.focus.path.push({_key: focusChild._key})
  }

  return keyedSelection
}
