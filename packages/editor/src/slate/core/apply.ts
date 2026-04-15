import type {PortableTextSpan} from '@portabletext/schema'
import {getSibling} from '../../node-traversal/get-sibling'
import {getSpanNode} from '../../node-traversal/get-span-node'
import {getDirtyPaths} from '../../paths/get-dirty-paths'
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
import {updateDirtyPaths} from './update-dirty-paths'

export const apply: WithEditorFirstArg<Editor['apply']> = (editor, op) => {
  for (const ref of editor.pathRefs) {
    PathRef.transform(ref, op)
  }

  for (const ref of editor.pointRefs) {
    PointRef.transform(ref, op)
  }

  for (const ref of editor.rangeRefs) {
    transformRangeRef(ref, op)
  }

  // Apply the operation to the tree first, so that getDirtyPaths
  // reads the final op.node._key (apply-operation may re-key nodes to
  // resolve duplicate keys, mutating op.node in place).
  applyOperation(editor, op)

  updateDirtyPaths(editor, getDirtyPaths(editor, op))

  editor.operations.push(op)
  normalize(editor, {
    operation: op,
  })

  // Clear any formats applied to the cursor if the selection changes.
  if (op.type === 'set_selection') {
    editor.marks = null

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
            editor,
            op.properties.focus.path,
            'next',
          )
          const previousSibling = getSibling(
            editor,
            op.properties.focus.path,
            'previous',
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
          editor.decoratorState = {}
        }
      }
    } else {
      // In any other case, we want to clear the decorator state.
      editor.decoratorState = {}
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
}
