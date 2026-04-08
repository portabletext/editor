import type {EditorActor} from '../editor/editor-machine'
import {range as editorRange} from '../slate/editor/range'
import type {Editor} from '../slate/interfaces/editor'
import {pointEquals} from '../slate/point/point-equals'
import {isBackwardRange} from '../slate/range/is-backward-range'

export function createBehaviorApiPlugin(editorActor: EditorActor) {
  return function behaviorApiPlugin(editor: Editor) {
    const {select, setSelection} = editor

    editor.select = (location) => {
      if (editor.isNormalizingNode || editor.isPerformingBehaviorOperation) {
        select(location)
        return
      }

      if (editor.selection) {
        select(location)
        return
      }

      const range = editorRange(editor, location)

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'select',
          at: {
            ...range,
            backward: isBackwardRange(range, editor),
          },
        },
        editor,
      })

      return
    }

    editor.setSelection = (partialRange) => {
      if (editor.isNormalizingNode || editor.isPerformingBehaviorOperation) {
        setSelection(partialRange)
        return
      }

      const anchor = partialRange.anchor
      const focus = partialRange.focus

      const backward = editor.selection
        ? isBackwardRange(
            {
              anchor: partialRange.anchor ?? editor.selection.anchor,
              focus: partialRange.focus ?? editor.selection.focus,
            },
            editor,
          )
        : partialRange.anchor && partialRange.focus
          ? isBackwardRange(
              {
                anchor: partialRange.anchor,
                focus: partialRange.focus,
              },
              editor,
            )
          : undefined

      if (editor.selection) {
        const newAnchor = partialRange.anchor ?? editor.selection.anchor
        const newFocus = partialRange.focus ?? editor.selection.focus

        if (
          pointEquals(newAnchor, editor.selection.anchor) &&
          pointEquals(newFocus, editor.selection.focus)
        ) {
          // To avoid double `select` events, we call `setSelection` directly
          // if the selection wouldn't actually change.
          setSelection(partialRange)
          return
        }
      }

      if (!anchor || !focus) {
        // In the unlikely event that either the anchor or the focus is
        // undefined, we call `setSelection` directly. This is because the
        // `select` event expects a complete selection.
        setSelection(partialRange)
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'select',
          at: {
            anchor,
            focus,
            backward,
          },
        },
        editor,
      })
      return
    }

    return editor
  }
}
