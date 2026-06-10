import type {PortableTextSpan} from '@portabletext/schema'
import {getDirtyPaths} from '../../paths/get-dirty-paths'
import {getSibling} from '../../traversal/get-sibling'
import {getSpan} from '../../traversal/get-span'
import {normalize} from '../editor/normalize'
import type {Editor} from '../interfaces/editor'
import {PathRef} from '../interfaces/path-ref'
import {PointRef} from '../interfaces/point-ref'
import {parentPath} from '../path/parent-path'
import {pathEquals} from '../path/path-equals'
import {transformRangeRef} from '../range-ref/transform-range-ref'
import {isCollapsedRange} from '../range/is-collapsed-range'
import type {WithEditorFirstArg} from '../utils/types'
import {applyOperation} from './apply-operation'
import {createOperationEvent, emitOperationEvent} from './operation-channel'
import {updateDirtyPaths} from './update-dirty-paths'

export const apply: WithEditorFirstArg<Editor['apply']> = (editor, op) => {
  const beforeListeners = editor.operationListeners.before
  const operationEvent =
    beforeListeners.length > 0 || editor.operationListeners.after.length > 0
      ? createOperationEvent(editor, op)
      : undefined

  if (operationEvent) {
    emitOperationEvent(beforeListeners, operationEvent)
  }

  for (const ref of editor.pathRefs) {
    PathRef.transform(ref, op)
  }

  for (const ref of editor.pointRefs) {
    PointRef.transform(ref, op)
  }

  for (const ref of editor.rangeRefs) {
    transformRangeRef(ref, op, editor.snapshot.context)
  }

  // Apply the operation to the tree first, so that getDirtyPaths
  // reads the final op.node._key (apply-operation may re-key nodes to
  // resolve duplicate keys, mutating op.node in place).
  applyOperation(editor, op)

  updateDirtyPaths(editor, getDirtyPaths(editor.snapshot.context, op))

  editor.operations.push(op)
  normalize(editor, {
    operation: op,
  })

  // Clear any formats applied to the cursor if the selection changes.
  if (op.type === 'set.selection') {
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
        const focusSpanEntry = getSpan(
          editor.snapshot,
          op.properties.focus.path,
        )
        const focusSpan: PortableTextSpan | undefined = focusSpanEntry?.node
        const newFocusSpanEntry = getSpan(
          editor.snapshot,
          op.newProperties.focus.path,
        )
        const newFocusSpan: PortableTextSpan | undefined =
          newFocusSpanEntry?.node

        // In the case of a collapsed selection moving to another collapsed
        // selection, we only want to clear the decorator state if the
        // caret is visually moving to a different span.
        const sameParent = pathEquals(
          parentPath(op.properties.focus.path),
          parentPath(op.newProperties.focus.path),
        )

        let movedToNextSpan = false
        let movedToPreviousSpan = false

        if (sameParent && focusSpan && newFocusSpan) {
          const nextSibling = getSibling(
            editor.snapshot,
            op.properties.focus.path,
            {
              direction: 'next',
            },
          )
          const previousSibling = getSibling(
            editor.snapshot,
            op.properties.focus.path,
            {
              direction: 'previous',
            },
          )

          movedToNextSpan =
            nextSibling !== undefined &&
            pathEquals(nextSibling.path, op.newProperties.focus.path) &&
            focusSpan.text.length === op.properties.focus.offset &&
            op.newProperties.focus.offset === 0

          movedToPreviousSpan =
            previousSibling !== undefined &&
            pathEquals(previousSibling.path, op.newProperties.focus.path) &&
            op.properties.focus.offset === 0 &&
            newFocusSpan.text.length === op.newProperties.focus.offset
        }

        if (!movedToNextSpan && !movedToPreviousSpan) {
          editor.snapshot.decoratorState = {}
        }
      }
    } else {
      // In any other case, we want to clear the decorator state.
      editor.snapshot.decoratorState = {}
    }
  }

  if (!editor.flushing) {
    editor.flushing = true

    Promise.resolve().then(() => {
      editor.flushing = false
      editor.onChange({operation: op})
      editor.operations = []
    })
  }

  if (operationEvent) {
    // Emitted last so that, when normalization fixes re-enter `apply`, a fix
    // operation's `after` listeners run before the triggering operation's.
    emitOperationEvent(editor.operationListeners.after, operationEvent)
  }
}
