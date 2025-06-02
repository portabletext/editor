import type {PortableTextBlock} from '@sanity/types'
import {Point, type Operation, type Range} from 'slate'
import type {EditorSelection, PortableTextSlateEditor} from '../types/editor'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {isTextBlock} from '../utils/util.is-text-block'
import type {EditorSchema} from './editor-schema'
import {isBackward, type IndexedEditorSelection} from './indexed-selection'
import {keyedPathToSlatePath, type KeyedPath} from './keyed-path'

export type KeyedEditorSelection = {
  anchor: KeyedEditorSelectionPoint
  focus: KeyedEditorSelectionPoint
  backward?: boolean
} | null

export type KeyedEditorSelectionPoint = {
  path: KeyedPath
  offset: number
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

export function getKeyedSelection(
  schema: EditorSchema,
  value: Array<PortableTextBlock>,
  selection: EditorSelection,
): KeyedEditorSelection {
  if (isKeyedSelection(selection)) {
    return selection
  }

  return indexedSelectionToKeyedSelection({
    schema,
    value,
    indexedSelection: selection,
  })
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
