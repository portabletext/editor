import type {Range} from 'slate'
import type {PortableTextSlateEditor} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import {
  getKeyedSelection,
  type EditorSelection,
  type KeyedEditorSelection,
} from './editor-selection'
import {keyedPathToSlatePath} from './keyed-path'

export function editorSelectionToSlateRange(
  schema: EditorSchema,
  selection: EditorSelection,
  editor: PortableTextSlateEditor,
): Range | null {
  const keyedSelection = getKeyedSelection(schema, editor.value, selection)

  if (!keyedSelection) {
    return null
  }

  return keyedSelectionToSlateRange(schema, keyedSelection, editor)
}

function keyedSelectionToSlateRange(
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
