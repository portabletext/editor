import {Editor} from '../slate'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {applySelect} from './apply-selection'

/**
 * Move the selection by a given distance and unit.
 *
 * Replaces `Transforms.move(editor, {unit, distance, reverse})` with
 * point computation and a raw `set_selection` operation.
 */
export function applyMove(
  editor: PortableTextSlateEditor,
  options: {
    distance?: number
    unit?: 'character' | 'word' | 'line' | 'offset'
    reverse?: boolean
  } = {},
): void {
  const {selection} = editor

  if (!selection) {
    return
  }

  const {distance = 1, unit = 'character', reverse = false} = options
  const {anchor, focus} = selection
  const opts = {distance, unit}

  const newAnchor = reverse
    ? Editor.before(editor, anchor, opts)
    : Editor.after(editor, anchor, opts)

  const newFocus = reverse
    ? Editor.before(editor, focus, opts)
    : Editor.after(editor, focus, opts)

  const props: {anchor?: typeof newAnchor; focus?: typeof newFocus} = {}

  if (newAnchor) {
    props.anchor = newAnchor
  }

  if (newFocus) {
    props.focus = newFocus
  }

  if (props.anchor || props.focus) {
    applySelect(editor, {...selection, ...props})
  }
}
