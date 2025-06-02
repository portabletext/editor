import {isEqual} from 'lodash'
import {
  Editor,
  Element,
  type Descendant,
  type Range,
  type Path as SlatePath,
} from 'slate'
import type {PortableTextSlateEditor} from '../types/editor'
import type {KeyedPath} from '../types/paths'
import {isKeyedSegment} from '../utils'
import type {EditorSchema} from './editor-schema'
import {
  getEditorSelection,
  type EditorSelection,
  type KeyedEditorSelection,
} from './editor-selection'

export function editorSelectionToSlateRange(
  schema: EditorSchema,
  selection: EditorSelection,
  editor: PortableTextSlateEditor,
): Range | null {
  const keyedSelection = getEditorSelection({
    type: 'keyed',
    schema,
    value: editor.value,
    selection,
  })

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
  const keyedSelection = getEditorSelection({
    type: 'keyed',
    schema,
    value: editor.value,
    selection,
  })

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

function keyedPathToSlatePath(
  path: KeyedPath,
  editor: PortableTextSlateEditor,
): SlatePath {
  if (!editor) {
    return []
  }
  const [block, blockPath] = Array.from(
    Editor.nodes(editor, {
      at: [],
      match: (n) =>
        isKeyedSegment(path[0]) && (n as Descendant)._key === path[0]._key,
    }),
  )[0] || [undefined, undefined]

  if (!block || !Element.isElement(block)) {
    return []
  }

  if (editor.isVoid(block)) {
    return [blockPath[0], 0]
  }

  const childPath = [path[2]]
  const childIndex = block.children.findIndex((child) =>
    isEqual([{_key: child._key}], childPath),
  )

  if (childIndex >= 0 && block.children[childIndex]) {
    const child = block.children[childIndex]
    if (Element.isElement(child) && editor.isVoid(child)) {
      return blockPath.concat(childIndex).concat(0)
    }
    return blockPath.concat(childIndex)
  }

  return [blockPath[0], 0]
}
