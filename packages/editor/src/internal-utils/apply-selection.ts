import {Point, Range} from '../slate'
import {end as editorEnd} from '../slate/editor/end'
import {start as editorStart} from '../slate/editor/start'
import type {PortableTextSlateEditor} from '../types/slate-editor'

/**
 * Set the editor selection to the given target.
 */
export function applySelect(
  editor: PortableTextSlateEditor,
  target: Range | Point | Path,
): void {
  const range = toRange(editor, target)
  const {selection} = editor

  if (selection) {
    const oldProps: Partial<Range> = {}
    const newProps: Partial<Range> = {}

    if (range.anchor != null && !Point.equals(range.anchor, selection.anchor)) {
      oldProps.anchor = selection.anchor
      newProps.anchor = range.anchor
    }

    if (range.focus != null && !Point.equals(range.focus, selection.focus)) {
      oldProps.focus = selection.focus
      newProps.focus = range.focus
    }

    if (Object.keys(oldProps).length > 0) {
      editor.apply({
        type: 'set_selection',
        properties: oldProps,
        newProperties: newProps,
      })
    }
  } else {
    editor.apply({
      type: 'set_selection',
      properties: null,
      newProperties: range,
    })
  }
}

/**
 * Clear the editor selection.
 */
export function applyDeselect(editor: PortableTextSlateEditor): void {
  const {selection} = editor

  if (selection) {
    editor.apply({
      type: 'set_selection',
      properties: selection,
      newProperties: null,
    })
  }
}

type Path = Array<number>

function toRange(
  editor: PortableTextSlateEditor,
  target: Range | Point | Path,
): Range {
  if (Range.isRange(target)) {
    return target
  }

  if (Point.isPoint(target)) {
    return {anchor: target, focus: target}
  }

  // Path — create a range spanning the entire node
  const start = editorStart(editor, target)
  const end = editorEnd(editor, target)
  return {anchor: start, focus: end}
}
