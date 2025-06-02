import type {KeyedSegment, PortableTextBlock} from '@sanity/types'
import type {Range} from 'slate'
import {getPointBlock, getPointChild} from '../internal-utils/slate-utils'
import type {PortableTextSlateEditor} from '../types/editor'
import type {IndexedPath, KeyedPath} from '../types/paths'
import {isKeyedSegment, isTextBlock} from '../utils'
import type {EditorSchema} from './editor-schema'
import {keyedPathToSlatePath} from './keyed-path'

/** @public */
export type EditorSelection =
  | KeyedEditorSelection
  | IndexedEditorSelection
  | null

/** @public */
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
} | null

/**
 * @beta
 */
export type IndexedEditorSelectionPoint = {
  path: IndexedPath
  offset: number
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

export function isIndexedSelectionPoint(
  point: EditorSelectionPoint,
): point is IndexedEditorSelectionPoint {
  return typeof point.path.at(0) === 'number'
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

export function isIndexedBlockLocator(
  path: [KeyedSegment] | [number],
): path is [number] {
  return typeof path.at(0) === 'number'
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

/**********
 * Keyed Selection
 **********/

export type KeyedEditorSelection = {
  anchor: KeyedEditorSelectionPoint
  focus: KeyedEditorSelectionPoint
  backward?: boolean
} | null

export type KeyedEditorSelectionPoint = {
  path: KeyedPath
  offset: number
}

export function getKeyedSelection(
  schema: EditorSchema,
  value: Array<PortableTextBlock>,
  selection: EditorSelection,
): KeyedEditorSelection {
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
}): KeyedEditorSelection {
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
    backward: isBackward({
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

export function keyedSelectionToSlateRange(
  schema: EditorSchema,
  selection: KeyedEditorSelection,
  editor: PortableTextSlateEditor,
): Range | null {
  const keyedSelection = getKeyedSelection(schema, editor.value, selection)

  if (!keyedSelection) {
    return null
  }

  const anchor = {
    path: keyedPathToSlatePath(keyedSelection.anchor.path, editor),
    offset: keyedSelection.anchor.offset,
  }
  const focus = {
    path: keyedPathToSlatePath(keyedSelection.focus.path, editor),
    offset: keyedSelection.focus.offset,
  }

  if (focus.path.length === 0 || anchor.path.length === 0) {
    return null
  }

  const range = anchor && focus ? {anchor, focus} : null

  return range
}
