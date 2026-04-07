import {after} from '../editor/after'
import {before} from '../editor/before'
import type {Editor} from '../interfaces/editor'
import type {Range} from '../interfaces/range'
import {isBackwardRange} from '../range/is-backward-range'
import type {MoveUnit, SelectionEdge} from '../types/types'

interface SelectionMoveOptions {
  distance?: number
  unit?: MoveUnit
  reverse?: boolean
  edge?: SelectionEdge
}

export function move(editor: Editor, options: SelectionMoveOptions = {}): void {
  const {selection} = editor
  const {distance = 1, unit = 'character', reverse = false} = options
  let {edge = null} = options

  if (!selection) {
    return
  }

  if (edge === 'start') {
    edge = isBackwardRange(selection, editor) ? 'focus' : 'anchor'
  }

  if (edge === 'end') {
    edge = isBackwardRange(selection, editor) ? 'anchor' : 'focus'
  }

  const {anchor, focus} = selection
  const opts = {distance, unit}
  const props: Partial<Range> = {}

  if (edge == null || edge === 'anchor') {
    const point = reverse
      ? before(editor, anchor, opts)
      : after(editor, anchor, opts)

    if (point) {
      props.anchor = point
    }
  }

  if (edge == null || edge === 'focus') {
    const point = reverse
      ? before(editor, focus, opts)
      : after(editor, focus, opts)

    if (point) {
      props.focus = point
    }
  }

  editor.setSelection(props)
}
