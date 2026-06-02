import type {EditorActor} from '../editor/editor-machine'
import {range as editorRange} from '../engine/editor/range'
import type {Editor} from '../engine/interfaces/editor'
import {pointEquals} from '../engine/point/point-equals'
import {isBackwardRange} from '../engine/range/is-backward-range'

export function createBehaviorApiPlugin(editorActor: EditorActor) {
  return function behaviorApiPlugin(editor: Editor) {
    const {select, setSelection} = editor

    editor.select = (location) => {
      if (editor.isNormalizingNode || editor.isPerformingBehaviorOperation) {
        select(location)
        return
      }

      if (editor.snapshot.context.selection) {
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
            backward: isBackwardRange(range, editor.snapshot.context),
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

      const backward = editor.snapshot.context.selection
        ? isBackwardRange(
            {
              anchor:
                partialRange.anchor ?? editor.snapshot.context.selection.anchor,
              focus:
                partialRange.focus ?? editor.snapshot.context.selection.focus,
            },
            editor.snapshot.context,
          )
        : partialRange.anchor && partialRange.focus
          ? isBackwardRange(
              {
                anchor: partialRange.anchor,
                focus: partialRange.focus,
              },
              editor.snapshot.context,
            )
          : undefined

      if (editor.snapshot.context.selection) {
        const newAnchor =
          partialRange.anchor ?? editor.snapshot.context.selection.anchor
        const newFocus =
          partialRange.focus ?? editor.snapshot.context.selection.focus

        if (
          pointEquals(newAnchor, editor.snapshot.context.selection.anchor) &&
          pointEquals(newFocus, editor.snapshot.context.selection.focus)
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
