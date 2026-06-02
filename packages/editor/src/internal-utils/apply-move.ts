import {after} from '../engine/editor/after'
import {before} from '../engine/editor/before'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {applySelect} from './apply-selection'

/**
 * Move the selection by a given distance and unit.
 */
export function applyMove(
  editor: PortableTextEditorEngine,
  options: {
    distance?: number
    unit?: 'character' | 'word' | 'line' | 'offset'
    reverse?: boolean
  } = {},
): void {
  const selection = editor.snapshot.context.selection

  if (!selection) {
    return
  }

  const {distance = 1, unit = 'character', reverse = false} = options
  const {anchor, focus} = selection
  const opts = {distance, unit}

  const newAnchor = reverse
    ? before(editor, anchor, opts)
    : after(editor, anchor, opts)

  const newFocus = reverse
    ? before(editor, focus, opts)
    : after(editor, focus, opts)

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
