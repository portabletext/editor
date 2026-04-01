import type {PortableTextSpan} from '@portabletext/schema'
import {getSpanNode} from '../../node-traversal/get-span-node'
import {getDirtyIndexedPaths} from '../../paths/get-dirty-indexed-paths'
import {normalize} from '../editor/normalize'
import type {Editor} from '../interfaces/editor'
import type {Path} from '../interfaces/path'
import {PathRef} from '../interfaces/path-ref'
import {PointRef} from '../interfaces/point-ref'
import {operationCanTransformPath} from '../path/operation-can-transform-path'
import {transformPath} from '../path/transform-path'
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

  // update dirty paths
  const needsTransform = operationCanTransformPath(op)
  // Appending a node at the end cannot shift any existing paths
  const isAppendAtEnd =
    needsTransform &&
    op.type === 'insert_node' &&
    op.path.length === 1 &&
    op.path[0]! >= editor.children.length
  const transform =
    needsTransform && !isAppendAtEnd
      ? (p: Path) => transformPath(p, op)
      : undefined
  updateDirtyPaths(editor, getDirtyIndexedPaths(editor, op), transform)

  applyOperation(editor, op)

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
        const movedToNextSpan =
          focusSpan &&
          newFocusSpan &&
          op.newProperties.focus.path[0] === op.properties.focus.path[0] &&
          op.newProperties.focus.path[1] === op.properties.focus.path[1]! + 1 &&
          focusSpan.text.length === op.properties.focus.offset &&
          op.newProperties.focus.offset === 0
        const movedToPreviousSpan =
          focusSpan &&
          newFocusSpan &&
          op.newProperties.focus.path[0] === op.properties.focus.path[0] &&
          op.newProperties.focus.path[1] === op.properties.focus.path[1]! - 1 &&
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

  if (!editor.flushing) {
    editor.flushing = true

    Promise.resolve().then(() => {
      editor.flushing = false
      editor.onChange({operation: op})
      editor.operations = []
    })
  }
}
