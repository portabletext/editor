import type {EditorActor} from '../editor/editor-machine'
import {
  slatePointToSelectionPoint,
  slateRangeToSelection,
} from '../internal-utils/slate-utils'
import {Editor, Node, Point, Range, Text} from '../slate'

export function createBehaviorApiPlugin(editorActor: EditorActor) {
  return function behaviorApiPlugin(editor: Editor) {
    const {delete: editorDelete, insertNodes, select, setSelection} = editor

    editor.delete = (options) => {
      if (editor.isNormalizingNode || editor.isPerformingBehaviorOperation) {
        editorDelete(options)
        return
      }

      const range = options?.at ? Editor.range(editor, options.at) : undefined
      const selection = range
        ? slateRangeToSelection({
            schema: editorActor.getSnapshot().context.schema,
            editor,
            range,
          })
        : undefined

      if (selection) {
        editorActor.send({
          type: 'behavior event',
          behaviorEvent: {
            type: 'delete',
            at: selection,
            direction: options?.reverse ? 'backward' : 'forward',
            unit: options?.unit,
          },
          editor,
        })
      } else {
        editorActor.send({
          type: 'behavior event',
          behaviorEvent: {
            type: 'delete',
            direction: options?.reverse ? 'backward' : 'forward',
            unit: options?.unit,
          },
          editor,
        })
      }
    }

    editor.insertBreak = () => {
      if (editor.isNormalizingNode || editor.isPerformingBehaviorOperation) {
        console.error('Unexpected call to .insertBreak(...)')
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'insert.break',
        },
        editor,
      })
      return
    }

    editor.insertData = (dataTransfer) => {
      if (editor.isNormalizingNode || editor.isPerformingBehaviorOperation) {
        console.error('Unexpected call to .insertData(...)')
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'input.*',
          originEvent: {
            dataTransfer,
          },
        },
        editor,
      })
    }

    editor.insertNodes = (nodes, options) => {
      if (editor.isNormalizingNode) {
        const normalizedNodes = (Node.isNode(nodes) ? [nodes] : nodes).map(
          (node) => {
            if (!Text.isText(node)) {
              return node
            }

            if (typeof node._type !== 'string') {
              return {
                ...(node as Node),
                _type: editorActor.getSnapshot().context.schema.span.name,
              }
            }

            return node
          },
        ) as Array<Node>

        insertNodes(normalizedNodes, options)

        return
      }

      insertNodes(nodes, options)
    }

    editor.insertText = (text) => {
      if (editor.isNormalizingNode || editor.isPerformingBehaviorOperation) {
        console.error('Unexpected call to .insertText(...)')
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'insert.text',
          text,
        },
        editor,
      })
      return
    }

    editor.redo = () => {
      if (editor.isNormalizingNode || editor.isPerformingBehaviorOperation) {
        console.error('Unexpected call to .redo(...)')
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'history.redo',
        },
        editor,
      })
      return
    }

    editor.select = (location) => {
      if (editor.isNormalizingNode || editor.isPerformingBehaviorOperation) {
        select(location)
        return
      }

      if (editor.selection) {
        select(location)
        return
      }

      const range = Editor.range(editor, location)

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

    editor.setFragmentData = () => {
      console.error('Unexpected call to .setFragmentData(...)')
      return
    }

    editor.undo = () => {
      if (editor.isNormalizingNode || editor.isPerformingBehaviorOperation) {
        console.error('Unexpected call to .undo(...)')
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'history.undo',
        },
        editor,
      })
      return
    }

    return editor
  }
}
