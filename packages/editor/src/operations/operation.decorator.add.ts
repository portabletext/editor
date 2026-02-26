import {applySelect} from '../internal-utils/apply-selection'
import {applySetNode} from '../internal-utils/apply-set-node'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {Editor, Node, Range, Text} from '../slate'
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
          value: operation.editor.value,
          selection: operation.at,
        },
        blockIndexMap: operation.editor.blockIndexMap,
      })
    : operation.editor.selection

  if (!at) {
    // Unable to add decorator without a selection
    return
  }

  if (Range.isExpanded(at)) {
    const rangeRef = Editor.rangeRef(editor, at, {affinity: 'inward'})
    const [start, end] = Range.edges(at)

    const endAtEndOfNode = Editor.isEnd(editor, end, end.path)

    if (!endAtEndOfNode || !Editor.isEdge(editor, end, end.path)) {
      const [endNode] = Editor.node(editor, end.path)
      editor.apply({
        type: 'split_node',
        path: end.path,
        position: end.offset,
        properties: Node.extractProps(endNode),
      })
    }

    const startAtStartOfNode = Editor.isStart(editor, start, start.path)

    if (!startAtStartOfNode || !Editor.isEdge(editor, start, start.path)) {
      const [startNode] = Editor.node(editor, start.path)
      editor.apply({
        type: 'split_node',
        path: start.path,
        position: start.offset,
        properties: Node.extractProps(startNode),
      })
    }

    at = rangeRef.unref()

    if (!at) {
      throw new Error('Unable to add decorator without a selection')
    }

    if (!operation.at) {
      applySelect(editor, at)
    }

    // Use new selection to find nodes to decorate
    const splitTextNodes = Editor.nodes(editor, {
      at,
      match: Text.isText,
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
      Editor.nodes(editor, {
        at,
        match: (node) => editor.isTextSpan(node),
      }),
    )?.at(0)

    if (!selectedSpan) {
      return
    }

    const [block, blockPath] = Editor.node(editor, at, {
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
      for (const [, spanPath] of Editor.nodes(editor, {
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
