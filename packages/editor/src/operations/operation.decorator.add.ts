import {isSpan} from '@portabletext/schema'
import {applySelect, resolveSelection} from '../internal-utils/apply-selection'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import {getNodes} from '../node-traversal/get-nodes'
import {getBlockSubSchema} from '../schema/get-block-sub-schema'
import {isEdge} from '../slate/editor/is-edge'
import {isEnd} from '../slate/editor/is-end'
import {isStart} from '../slate/editor/is-start'
import {rangeRef} from '../slate/editor/range-ref'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import {parentPath} from '../slate/path/parent-path'
import {isExpandedRange} from '../slate/range/is-expanded-range'
import {rangeEdges} from '../slate/range/range-edges'
import {rangeEnd} from '../slate/range/range-end'
import {rangeStart} from '../slate/range/range-start'
import type {OperationImplementation} from './operation.types'

export const decoratorAddOperationImplementation: OperationImplementation<
  'decorator.add'
> = ({context, operation}) => {
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
      const [start, end] = rangeEdges(at!, {}, editor)

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

        // Skip spans whose sub-schema doesn't declare this decorator.
        const blockPath = parentPath(spanPath)
        const subSchema = getBlockSubSchema(context, blockPath)
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

    const blockEntry = getAncestorTextBlock(context, at.focus.path)
    if (!blockEntry) {
      return
    }
    const {node: block, path: blockPath} = blockEntry

    // If the decorator isn't declared by this block's sub-schema, do nothing.
    const subSchema = getBlockSubSchema(context, blockPath)
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
