import {Editor} from '../interfaces/editor'
import type {Range} from '../interfaces/range'
import {Range as RangeUtils} from '../interfaces/range'
import type {MoveUnit, SelectionEdge} from '../types/types'

export interface SelectionMoveOptions {
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
    edge = RangeUtils.isBackward(selection) ? 'focus' : 'anchor'
  }

  if (edge === 'end') {
    edge = RangeUtils.isBackward(selection) ? 'anchor' : 'focus'
  }

  const {anchor, focus} = selection
  const opts = {distance, unit}
  const props: Partial<Range> = {}

  if (edge == null || edge === 'anchor') {
    const point = reverse
      ? Editor.before(editor, anchor, opts)
      : Editor.after(editor, anchor, opts)

    if (point) {
      props.anchor = point
    }
  }

  if (edge == null || edge === 'focus') {
    const point = reverse
      ? Editor.before(editor, focus, opts)
      : Editor.after(editor, focus, opts)

    if (point) {
      props.focus = point
    }
  }

  editor.setSelection(props)
}
