import type {PortableTextSpan} from '@portabletext/schema'
import {getSpanNode} from '../node-traversal/get-span-node'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import type {PortableTextSlateEditor} from '../types/slate-editor'

export function createNormalizationPlugin(): (
  editor: PortableTextSlateEditor,
) => PortableTextSlateEditor {
  return function normalizationPlugin(editor: PortableTextSlateEditor) {
    const {apply} = editor

    editor.apply = (op) => {
      /**
       * We don't want to run any side effects when the editor is processing
       * remote changes.
       */
      if (editor.isProcessingRemoteChanges) {
        apply(op)
        return
      }

      /**
       * We don't want to run any side effects when the editor is undoing or
       * redoing operations.
       */
      if (editor.isUndoing || editor.isRedoing) {
        apply(op)
        return
      }

      if (op.type === 'set_selection') {
        if (
          op.properties &&
          op.newProperties &&
          op.properties.anchor &&
          op.properties.focus &&
          op.newProperties.anchor &&
          op.newProperties.focus
        ) {
          const previousSelectionIsCollapsed = isCollapsedRange({
            anchor: op.properties.anchor,
            focus: op.properties.focus,
          })
          const newSelectionIsCollapsed = isCollapsedRange({
            anchor: op.newProperties.anchor,
            focus: op.newProperties.focus,
          })

          if (previousSelectionIsCollapsed && newSelectionIsCollapsed) {
            const focusSpanEntry = getSpanNode(editor, op.properties.focus.path)
            const focusSpan: PortableTextSpan | undefined = focusSpanEntry?.node
            const newFocusSpanEntry = getSpanNode(
              editor,
              op.newProperties.focus.path,
            )
            const newFocusSpan: PortableTextSpan | undefined =
              newFocusSpanEntry?.node
            const movedToNextSpan =
              focusSpan &&
              newFocusSpan &&
              op.newProperties.focus.path[0] === op.properties.focus.path[0] &&
              op.newProperties.focus.path[1] ===
                op.properties.focus.path[1]! + 1 &&
              focusSpan.text.length === op.properties.focus.offset &&
              op.newProperties.focus.offset === 0
            const movedToPreviousSpan =
              focusSpan &&
              newFocusSpan &&
              op.newProperties.focus.path[0] === op.properties.focus.path[0] &&
              op.newProperties.focus.path[1] ===
                op.properties.focus.path[1]! - 1 &&
              op.properties.focus.offset === 0 &&
              newFocusSpan.text.length === op.newProperties.focus.offset

            // In the case of a collapsed selection moving to another collapsed
            // selection, we only want to clear the decorator state if the
            // caret is visually moving to a different span.
            if (!movedToNextSpan && !movedToPreviousSpan) {
              editor.decoratorState = {}
            }
          }
        } else {
          // In any other case, we want to clear the decorator state.
          editor.decoratorState = {}
        }
      }

      apply(op)
    }

    return editor
  }
}
