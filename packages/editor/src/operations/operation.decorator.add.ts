import type {PortableTextBlock} from '@portabletext/schema'
import {applySelect} from '../internal-utils/apply-selection'
import {applySetNode} from '../internal-utils/apply-set-node'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {isEdge} from '../slate/editor/is-edge'
import {isEnd} from '../slate/editor/is-end'
import {isStart} from '../slate/editor/is-start'
import {node as editorNode} from '../slate/editor/node'
import {nodes} from '../slate/editor/nodes'
import {rangeRef} from '../slate/editor/range-ref'
import {extractProps} from '../slate/node/extract-props'
import {isExpandedRange} from '../slate/range/is-expanded-range'
import {rangeEdges} from '../slate/range/range-edges'
import {isText} from '../slate/text/is-text'
import type {OperationImplementation} from './operation.types'

export const decoratorAddOperationImplementation: OperationImplementation<
  'decorator.add'
> = ({context, operation}) => {
  const editor = operation.editor
  const mark = operation.decorator

  let at = operation.at
    ? toSlateRange({
        context: {
          schema: context.schema,
          value: operation.editor.children as Array<PortableTextBlock>,
          selection: operation.at,
        },
        blockIndexMap: operation.editor.blockIndexMap,
      })
    : operation.editor.selection

  if (!at) {
    // Unable to add decorator without a selection
    return
  }

  if (isExpandedRange(at)) {
    const ref = rangeRef(editor, at, {affinity: 'inward'})
    const [start, end] = rangeEdges(at)

    const endAtEndOfNode = isEnd(editor, end, end.path)

    if (!endAtEndOfNode || !isEdge(editor, end, end.path)) {
      const [endNode] = editorNode(editor, end.path)
      applySplitNode(
        editor,
        end.path,
        end.offset,
        extractProps(endNode, editor.schema),
      )
    }

    const startAtStartOfNode = isStart(editor, start, start.path)

    if (!startAtStartOfNode || !isEdge(editor, start, start.path)) {
      const [startNode] = editorNode(editor, start.path)
      applySplitNode(
        editor,
        start.path,
        start.offset,
        extractProps(startNode, editor.schema),
      )
    }

    at = ref.unref()

    if (!at) {
      throw new Error('Unable to add decorator without a selection')
    }

    if (!operation.at) {
      applySelect(editor, at)
    }

    // Use new selection to find nodes to decorate
    const splitTextNodes = nodes(editor, {
      at,
      match: (n) => isText(n, editor.schema),
    })

    for (const [node, path] of splitTextNodes) {
      const marks = [
        ...(Array.isArray(node.marks) ? node.marks : []).filter(
          (eMark: string) => eMark !== mark,
        ),
        mark,
      ]
      applySetNode(editor, {marks}, path)
    }
  } else {
    const selectedSpan = Array.from(
      nodes(editor, {
        at,
        match: (node) => editor.isTextSpan(node),
      }),
    )?.at(0)

    if (!selectedSpan) {
      return
    }

    const [block, blockPath] = editorNode(editor, at, {
      depth: 1,
    })
    const lonelyEmptySpan =
      editor.isTextBlock(block) &&
      block.children.length === 1 &&
      editor.isTextSpan(block.children[0]) &&
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
      for (const [, spanPath] of nodes(editor, {
        at: blockPath,
        match: (node) => editor.isTextSpan(node),
      })) {
        applySetNode(editor, {marks: newMarks}, spanPath)
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
