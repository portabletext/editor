import type {EditorActor} from '../editor/editor-machine'
import {
  slatePointToSelectionPoint,
  slateRangeToSelection,
} from '../internal-utils/slate-utils'
import {Point, Range, type Editor} from '../slate'
import {range as editorRange} from '../slate/editor/range'

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
          at: slateRangeToSelection({
            schema: editorActor.getSnapshot().context.schema,
            editor,
            range,
          }),
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
        ? slatePointToSelectionPoint({
            schema: editorActor.getSnapshot().context.schema,
            editor,
            point: partialRange.anchor,
          })
        : undefined
      const focus = partialRange.focus
        ? slatePointToSelectionPoint({
            schema: editorActor.getSnapshot().context.schema,
            editor,
            point: partialRange.focus,
          })
        : undefined

      const backward = editor.selection
        ? Range.isBackward({
            anchor: partialRange.anchor ?? editor.selection.anchor,
            focus: partialRange.focus ?? editor.selection.focus,
          })
        : partialRange.anchor && partialRange.focus
          ? Range.isBackward({
              anchor: partialRange.anchor,
              focus: partialRange.focus,
            })
          : undefined

      if (editor.selection) {
        const newAnchor = partialRange.anchor ?? editor.selection.anchor
        const newFocus = partialRange.focus ?? editor.selection.focus

        if (
          Point.equals(newAnchor, editor.selection.anchor) &&
          Point.equals(newFocus, editor.selection.focus)
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
