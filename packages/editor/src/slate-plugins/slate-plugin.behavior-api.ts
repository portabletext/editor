import type {EditorActor} from '../editor/editor-machine'
import {
  slatePointToSelectionPoint,
  slateRangeToSelection,
} from '../internal-utils/slate-utils'
import {Editor, Point, Range, Text, type Node} from '../slate'

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

    editor.deleteBackward = (unit) => {
      if (editor.isNormalizingNode || editor.isPerformingBehaviorOperation) {
        console.error('Unexpected call to .deleteBackward(...)')
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'delete.backward',
          unit,
        },
        editor,
      })
      return
    }

    editor.deleteForward = (unit) => {
      if (editor.isNormalizingNode || editor.isPerformingBehaviorOperation) {
        console.error('Unexpected call to .deleteForward(...)')
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'delete.forward',
          unit,
        },
        editor,
      })
      return
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
        // Slate's normalization creates bare text nodes ({text: ''})
        // without _type or marks. Promote them to proper spans before
        // they reach Transforms.insertNodes, which checks Node.isNode.
        const promoted: Array<Node> = []

        for (const node of Array.isArray(nodes) ? nodes : [nodes]) {
          if (Text.isText(node)) {
            const record = node as unknown as Record<string, unknown>
            const needsType = typeof record['_type'] !== 'string'

            if (needsType) {
              promoted.push({
                ...(node as Node),
                _type: editorActor.getSnapshot().context.schema.span.name,
              })
              continue
            }
          } else {
            const record = node as Record<string, unknown>
            if (
              typeof record['text'] === 'string' &&
              !Array.isArray(record['marks'])
            ) {
              // Bare text node without marks — promote to span
              promoted.push({
                ...record,
                _type:
                  typeof record['_type'] === 'string'
                    ? record['_type']
                    : editorActor.getSnapshot().context.schema.span.name,
                marks: [],
              } as unknown as Node)
              continue
            }
          }

          promoted.push(node)
        }

        insertNodes(promoted, options)
        return
      }

      insertNodes(nodes, options)
    }

    editor.insertSoftBreak = () => {
      if (editor.isNormalizingNode || editor.isPerformingBehaviorOperation) {
        console.error('Unexpected call to .insertSoftBreak(...)')
        return
      }

      editorActor.send({
        type: 'behavior event',
        behaviorEvent: {
          type: 'insert.soft break',
        },
        editor,
      })
      return
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
