import type {KeyboardEvent} from 'react'
import {Node, Range, Transforms} from '../slate'
import Hotkeys from '../slate-dom/utils/hotkeys'
import getDirection from '../slate-react/utils/direction'
import type {PortableTextSlateEditor} from '../types/slate-editor'

/**
 * Handle movement hotkeys that browsers don't handle correctly.
 *
 * Chrome doesn't properly extend selections and Firefox doesn't properly
 * collapse them. Void nodes and zero-width text nodes adjacent to inlines
 * also need manual handling because browsers can't skip over them.
 */
export function performMovementHotkey({
  editor,
  event,
}: {
  editor: PortableTextSlateEditor
  event: KeyboardEvent<HTMLDivElement>
}) {
  const {nativeEvent} = event
  const {selection} = editor

  const element =
    editor.children[selection !== null ? selection.focus.path[0]! : 0]!
  const isRTL = getDirection(Node.string(element, editor.schema)) === 'rtl'

  if (Hotkeys.isMoveLineBackward(nativeEvent)) {
    event.preventDefault()
    Transforms.move(editor, {unit: 'line', reverse: true})
    return
  }

  if (Hotkeys.isMoveLineForward(nativeEvent)) {
    event.preventDefault()
    Transforms.move(editor, {unit: 'line'})
    return
  }

  if (Hotkeys.isExtendLineBackward(nativeEvent)) {
    event.preventDefault()
    Transforms.move(editor, {
      unit: 'line',
      edge: 'focus',
      reverse: true,
    })
    return
  }

  if (Hotkeys.isExtendLineForward(nativeEvent)) {
    event.preventDefault()
    Transforms.move(editor, {unit: 'line', edge: 'focus'})
    return
  }

  if (Hotkeys.isMoveBackward(nativeEvent)) {
    event.preventDefault()

    if (selection && Range.isCollapsed(selection)) {
      Transforms.move(editor, {reverse: !isRTL})
    } else {
      Transforms.collapse(editor, {
        edge: isRTL ? 'end' : 'start',
      })
    }

    return
  }

  if (Hotkeys.isMoveForward(nativeEvent)) {
    event.preventDefault()

    if (selection && Range.isCollapsed(selection)) {
      Transforms.move(editor, {reverse: isRTL})
    } else {
      Transforms.collapse(editor, {
        edge: isRTL ? 'start' : 'end',
      })
    }

    return
  }

  if (Hotkeys.isMoveWordBackward(nativeEvent)) {
    event.preventDefault()

    if (selection && Range.isExpanded(selection)) {
      Transforms.collapse(editor, {edge: 'focus'})
    }

    Transforms.move(editor, {
      unit: 'word',
      reverse: !isRTL,
    })
    return
  }

  if (Hotkeys.isMoveWordForward(nativeEvent)) {
    event.preventDefault()

    if (selection && Range.isExpanded(selection)) {
      Transforms.collapse(editor, {edge: 'focus'})
    }

    Transforms.move(editor, {
      unit: 'word',
      reverse: isRTL,
    })
    return
  }
}
