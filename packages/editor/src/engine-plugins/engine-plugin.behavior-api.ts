import type {EditorActor} from '../editor/editor-machine'
import {isInNormalization} from '../engine/core/apply-context'
import {range as editorRange} from '../engine/editor/range'
import type {Editor} from '../engine/interfaces/editor'
import {pointEquals} from '../engine/point/point-equals'
import {isBackwardRange} from '../engine/range/is-backward-range'

export function createBehaviorApiPlugin(editorActor: EditorActor) {
  return function behaviorApiPlugin(editor: Editor) {
    const {select, setSelection} = editor

    editor.select = (location) => {
      if (
        isInNormalization(editor.applyContext) ||
        editor.isPerformingBehaviorOperation
      ) {
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
      if (
        isInNormalization(editor.applyContext) ||
        editor.isPerformingBehaviorOperation
      ) {
        setSelection(partialRange)
        return
      }

      const selection = editor.snapshot.context.selection
      const anchor = partialRange.anchor ?? selection?.anchor
      const focus = partialRange.focus ?? selection?.focus

      if (!anchor || !focus) {
        // Without a current selection a partial range can't be completed,
        // and core `setSelection` would ignore it too.
        return
      }

      if (
        selection &&
        pointEquals(anchor, selection.anchor) &&
        pointEquals(focus, selection.focus)
      ) {
        return
      }

      const backward = isBackwardRange({anchor, focus}, editor.snapshot.context)

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
