import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import type {Range} from 'slate'
import {isTextBlock} from '../internal-utils/parse-blocks'
import {keyedSelectionToSlateRange} from '../internal-utils/ranges'
import {getPointBlock, getPointChild} from '../internal-utils/slate-utils'
import type {
  EditorSelection,
  EditorSelectionPoint,
  PortableTextSlateEditor,
} from '../types/editor'
import {isKeyedSegment} from '../utils'
import type {EditorSchema} from './editor-schema'
import type {
  KeyedEditorSelection,
  KeyedEditorSelectionPoint,
} from './keyed-selection'

/**
 * @beta
 */
export type IndexedEditorSelection = {
  anchor: IndexedEditorSelectionPoint
  focus: IndexedEditorSelectionPoint
  backward?: undefined
} | null

/**
 * @beta
 */
export type IndexedEditorSelectionPoint = {
  path: IndexedPath
  offset: number
}

export type IndexedPath = Array<number>

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

export function getIndexedSelection(
  schema: EditorSchema,
  value: Array<PortableTextBlock>,
  selection: EditorSelection | IndexedEditorSelection,
): IndexedEditorSelection {
  if (!isIndexedSelection(selection)) {
    return selectionToIndexedSelection({
      schema,
      value,
      selection,
    })
  }

  return selection
}

export function getKeyedSelection(
  schema: EditorSchema,
  value: Array<PortableTextBlock>,
  selection: EditorSelection | IndexedEditorSelection,
): KeyedEditorSelection {
  if (!isIndexedSelection(selection)) {
    return selection
  }

  return indexedSelectionToKeyedSelection({
    schema,
    value,
    indexedSelection: selection,
  })
}

export function isIndexedSelectionPoint(
  point: EditorSelectionPoint,
): point is IndexedEditorSelectionPoint {
  return typeof point.path.at(0) === 'number'
}

export function getIndexedSelectionPoint(
  schema: EditorSchema,
  value: Array<PortableTextBlock>,
  point: EditorSelectionPoint | IndexedEditorSelectionPoint,
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

export function isIndexedBlockLocator(
  path: [KeyedSegment] | [number],
): path is [number] {
  return typeof path.at(0) === 'number'
}

export function getKeyedSelectionPoint(
  schema: EditorSchema,
  value: Array<PortableTextBlock>,
  point: EditorSelectionPoint,
): KeyedEditorSelectionPoint | null {
  if (!isIndexedSelectionPoint(point)) {
    return point
  }

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

export function isBackward(selection: IndexedEditorSelection): boolean {
  if (!selection) {
    return false
  }

  return isPointAfter(selection.anchor, selection.focus)
}

/**
 * Check if one point is after another point
 */
export function isPointAfter(
  point: IndexedEditorSelectionPoint,
  another: IndexedEditorSelectionPoint,
): boolean {
  return comparePoints(point, another) === 'after'
}

/**
 * Check if one point is before another point
 */
export function isPointBefore(
  point: IndexedEditorSelectionPoint,
  another: IndexedEditorSelectionPoint,
): boolean {
  return comparePoints(point, another) === 'before'
}

/**
 * Check if two points are equal
 */
export function pointEquals(
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

  const startA = isBackward(selectionA) ? selectionA.focus : selectionA.anchor
  const endA = isBackward(selectionA) ? selectionA.anchor : selectionA.focus

  const startB = isBackward(selectionB) ? selectionB.focus : selectionB.anchor
  const endB = isBackward(selectionB) ? selectionB.anchor : selectionB.focus

  if (isPointBefore(endB, startA)) {
    return false
  }

  if (isPointAfter(startB, endA)) {
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

export function isCollapsed(selection: IndexedEditorSelection): boolean {
  if (!selection) {
    return false
  }

  return pointEquals(selection.anchor, selection.focus)
}

export function isExpanded(selection: IndexedEditorSelection): boolean {
  return !isCollapsed(selection)
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
}): IndexedEditorSelection {
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

/**
 * Turn an `IndexedEditorSelection` into a `KeyedEditorSelection`
 */
function indexedSelectionToKeyedSelection({
  schema,
  value,
  indexedSelection,
}: {
  schema: EditorSchema
  value: Array<PortableTextBlock>
  indexedSelection: IndexedEditorSelection
}): KeyedEditorSelection {
  if (!indexedSelection) {
    return null
  }

  const anchorBlockIndex = indexedSelection.anchor.path.at(0)
  const anchorBlock =
    anchorBlockIndex !== undefined ? value.at(anchorBlockIndex) : undefined

  if (!anchorBlock) {
    return null
  }

  const focusBlockIndex = indexedSelection.focus.path.at(0)
  const focusBlock =
    focusBlockIndex !== undefined ? value.at(focusBlockIndex) : undefined

  if (!focusBlock) {
    return null
  }

  const selection: EditorSelection = {
    anchor: {
      path: [{_key: anchorBlock._key}],
      offset: indexedSelection.anchor.offset,
    },
    focus: {
      path: [{_key: focusBlock._key}],
      offset: indexedSelection.focus.offset,
    },
    backward: isBackward(indexedSelection),
  }

  const anchorChildIndex = indexedSelection.anchor.path.at(1)
  const anchorChild =
    anchorChildIndex !== undefined && isTextBlock({schema}, anchorBlock)
      ? anchorBlock?.children.at(anchorChildIndex)
      : undefined

  if (anchorChild) {
    selection.anchor.path.push('children')
    selection.anchor.path.push({_key: anchorChild._key})
  }

  const focusChildIndex = indexedSelection.focus.path.at(1)
  const focusChild =
    focusChildIndex !== undefined && isTextBlock({schema}, focusBlock)
      ? focusBlock?.children.at(focusChildIndex)
      : undefined

  if (focusChild) {
    selection.focus.path.push('children')
    selection.focus.path.push({_key: focusChild._key})
  }

  return selection
}

export function slateRangeToIndexedSelection({
  schema,
  editor,
  range,
}: {
  schema: EditorSchema
  editor: PortableTextSlateEditor
  range: Range
}): IndexedEditorSelection {
  const [anchorBlock, anchorBlockPath] = getPointBlock({
    editor,
    point: range.anchor,
  })
  const anchorBlockIndex = anchorBlockPath?.at(0)
  const [focusBlock, focusBlockPath] = getPointBlock({
    editor,
    point: range.focus,
  })
  const focusBlockIndex = focusBlockPath?.at(0)

  if (
    !anchorBlock ||
    anchorBlockIndex === undefined ||
    !focusBlock ||
    focusBlockIndex === undefined
  ) {
    return null
  }

  const [, anchorChildPath] =
    anchorBlock._type === schema.block.name
      ? getPointChild({
          editor,
          point: range.anchor,
        })
      : [undefined, undefined]
  const anchorChildIndex = anchorChildPath?.at(1)

  const [, focusChildPath] =
    focusBlock._type === schema.block.name
      ? getPointChild({
          editor,
          point: range.focus,
        })
      : [undefined, undefined]
  const focusChildIndex = focusChildPath?.at(1)

  const selection: IndexedEditorSelection = {
    anchor: {
      path: [anchorBlockIndex],
      offset: range.anchor.offset,
    },
    focus: {
      path: [focusBlockIndex],
      offset: range.focus.offset,
    },
  }

  if (anchorChildIndex !== undefined) {
    selection.anchor.path.push(anchorChildIndex)
  }

  if (focusChildIndex !== undefined) {
    selection.focus.path.push(focusChildIndex)
  }

  return selection
}

export function indexedSelectionToSlateRange(
  schema: EditorSchema,
  value: Array<PortableTextBlock>,
  selection: IndexedEditorSelection,
  editor: PortableTextSlateEditor,
): IndexedEditorSelection {
  const editorSelection = getKeyedSelection(schema, value, selection)

  return keyedSelectionToSlateRange(schema, editorSelection, editor)
}
