import type {PortableTextBlock} from '@sanity/types'
import type {EditorSelection} from '..'
import type {EditorSchema} from '../editor/editor-schema'
import {
  getIndexedSelection,
  type IndexedEditorSelection,
  type IndexedEditorSelectionPoint,
} from '../editor/indexed-selection'
import {isSpan, isTextBlock} from './parse-blocks'

function normalizePoint(
  schema: EditorSchema,
  point: IndexedEditorSelectionPoint,
  value: PortableTextBlock[],
): IndexedEditorSelectionPoint | null {
  const blockIndex = point.path.at(0)

  if (blockIndex === undefined) {
    return null
  }

  const block = value.at(blockIndex)

  if (!block) {
    return null
  }

  if (!isTextBlock({schema}, block)) {
    return {
      path: [blockIndex],
      offset: 0,
    }
  }

  const childIndex = point.path.at(1)

  const child =
    childIndex !== undefined ? block.children.at(childIndex) : undefined

  if (childIndex === undefined || !child || !isSpan({schema}, child)) {
    return {
      path: [blockIndex],
      offset: 0,
    }
  }

  return {
    path: [blockIndex, childIndex],
    offset:
      child.text.length >= point.offset ? point.offset : child.text.length,
  }
}

export function normalizeSelection(
  schema: EditorSchema,
  selection: EditorSelection,
  value: PortableTextBlock[] | undefined,
): IndexedEditorSelection | null {
  if (!value || value.length === 0) {
    return null
  }

  const indexedSelection = getIndexedSelection(schema, value, selection)

  if (!indexedSelection) {
    return null
  }

  const anchor = normalizePoint(schema, indexedSelection.anchor, value)
  const focus = normalizePoint(schema, indexedSelection.focus, value)

  if (anchor && focus) {
    return {
      anchor,
      focus,
    }
  }

  return null
}
