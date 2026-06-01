import {isSpan, isTextBlock} from '@portabletext/schema'
import {isEdge} from '../engine/editor/is-edge'
import {isEnd} from '../engine/editor/is-end'
import {isStart} from '../engine/editor/is-start'
import {rangeRef} from '../engine/editor/range-ref'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import {parentPath} from '../engine/path/parent-path'
import {isExpandedRange} from '../engine/range/is-expanded-range'
import {rangeEdges} from '../engine/range/range-edges'
import {rangeEnd} from '../engine/range/range-end'
import {rangeStart} from '../engine/range/range-start'
import {applySelect, resolveSelection} from '../internal-utils/apply-selection'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {getNodes} from '../traversal/get-nodes'
import {getParent} from '../traversal/get-parent'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'
import type {OperationImplementation} from './operation.types'

export const decoratorAddOperationImplementation: OperationImplementation<
  'decorator.add'
> = ({snapshot, operation}) => {
  const editor = operation.editor
  const mark = operation.decorator

  let at = operation.at
    ? resolveSelection(operation.editor, operation.at)
    : operation.editor.selection

  if (!at) {
    // Unable to add decorator without a selection
    return
  }

  if (isExpandedRange(at)) {
    const ref = rangeRef(editor, at, {affinity: 'inward'})

    withoutNormalizing(editor, () => {
      const [start, end] = rangeEdges(at!, editor)

      if (!isEdge(editor, end, end.path)) {
        applySplitNode(editor, end.path, end.offset)
      }

      if (!isEdge(editor, start, start.path)) {
        applySplitNode(editor, start.path, start.offset)
      }

      at = ref.unref()

      if (!at) {
        throw new Error('Unable to add decorator without a selection')
      }

      if (!operation.at) {
        applySelect(editor, at)
      }

      // Use new selection to find nodes to decorate
      const atStart = rangeStart(at, editor)
      const atEnd = rangeEnd(at, editor)
      const splitTextNodes = Array.from(
        getNodes(editor, {
          from: atStart.path,
          to: atEnd.path,
          match: (n) => isSpan({schema: editor.schema}, n),
        }),
      )

      for (const {node, path: spanPath} of splitTextNodes) {
        if (!isSpan({schema: editor.schema}, node)) {
          continue
        }

        // Skip edge spans where the selection doesn't include any text.
        // For empty spans (where isStart and isEnd are both true at offset 0),
        // the span is fully selected so we should not skip it.
        if (
          (isEnd(editor, atStart, spanPath) &&
            !isStart(editor, atStart, spanPath)) ||
          (isStart(editor, atEnd, spanPath) && !isEnd(editor, atEnd, spanPath))
        ) {
          continue
        }

        // The sub-schema at the block path is authoritative: skip spans
        // whose block doesn't declare this decorator.
        const blockPath = parentPath(spanPath)
        const subSchema = getPathSubSchema(snapshot, blockPath)
        if (
          !subSchema.decorators.some((decorator) => decorator.name === mark)
        ) {
          continue
        }

        const marks = [
          ...(Array.isArray(node.marks) ? node.marks : []).filter(
            (eMark: string) => eMark !== mark,
          ),
          mark,
        ]
        setNodeProperties(editor, {marks}, spanPath)
      }
    }) // end withoutNormalizing
  } else {
    const selectedSpan = Array.from(
      getNodes(editor, {
        from: rangeStart(at, editor).path,
        to: rangeEnd(at, editor).path,
        match: (node) => isSpan({schema: editor.schema}, node),
      }),
    )?.at(0)

    if (!selectedSpan) {
      return
    }

    const blockEntry = getParent(snapshot, at.focus.path, {
      match: (node) => isTextBlock({schema: snapshot.context.schema}, node),
    })
    if (!blockEntry) {
      return
    }
    const {node: block, path: blockPath} = blockEntry

    // The sub-schema at the block path is authoritative: bail when the
    // block doesn't declare this decorator.
    const subSchema = getPathSubSchema(snapshot, blockPath)
    if (!subSchema.decorators.some((decorator) => decorator.name === mark)) {
      return
    }

    const lonelyEmptySpan =
      block.children.length === 1 &&
      isSpan({schema: editor.schema}, block.children[0]) &&
      block.children[0].text === ''
        ? block.children[0]
        : undefined

    if (lonelyEmptySpan) {
      const existingMarks = lonelyEmptySpan.marks ?? []
      const existingMarksWithoutDecorator = existingMarks.filter(
        (existingMark) => existingMark !== mark,
      )

      const newMarks =
        existingMarks.length === existingMarksWithoutDecorator.length
          ? [...existingMarks, mark]
          : existingMarksWithoutDecorator
      for (const {path: spanPath} of Array.from(
        getNodes(editor, {
          at: blockPath,
          match: (node) => isSpan({schema: editor.schema}, node),
        }),
      )) {
        setNodeProperties(editor, {marks: newMarks}, spanPath)
      }
    } else {
      editor.decoratorState[mark] = true
    }
  }

  if (editor.selection) {
    // Reselect
    const selection = editor.selection
    editor.selection = {...selection}
  }
}
