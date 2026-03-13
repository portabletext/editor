import type {Editor} from '../interfaces/editor'
import {Range} from '../interfaces/range'
import type {SelectionEdge} from '../types/types'
import {select} from './select'

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
    select(editor, selection.anchor)
  } else if (edge === 'focus') {
    select(editor, selection.focus)
  } else if (edge === 'start') {
    const [start] = Range.edges(selection)
    select(editor, start)
  } else if (edge === 'end') {
    const [, end] = Range.edges(selection)
    select(editor, end)
  }
}
