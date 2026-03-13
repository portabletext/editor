import type {Editor} from '../interfaces/editor'
import {Range} from '../interfaces/range'
import type {SelectionEdge} from '../types/types'

export interface SelectionCollapseOptions {
  edge?: SelectionEdge
}

export function collapse(
  editor: Editor,
  options: SelectionCollapseOptions = {},
): void {
  const {edge = 'anchor'} = options
  const {selection} = editor

  if (!selection) {
    return
  } else if (edge === 'anchor') {
    editor.select(selection.anchor)
  } else if (edge === 'focus') {
    editor.select(selection.focus)
  } else if (edge === 'start') {
    const [start] = Range.edges(selection)
    editor.select(start)
  } else if (edge === 'end') {
    const [, end] = Range.edges(selection)
    editor.select(end)
  }
}
