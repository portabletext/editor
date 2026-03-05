import {applySetNode} from '../internal-utils/apply-set-node'
import {editorToSlateRange} from '../internal-utils/to-slate-range'
import {Editor, Element, Node, Range, Text} from '../slate'
import type {OperationImplementation} from './operation.types'

export const decoratorRemoveOperationImplementation: OperationImplementation<
  'decorator.remove'
> = ({context, operation}) => {
  const editor = operation.editor
  const mark = operation.decorator
  const at = operation.at
    ? editorToSlateRange(operation.editor, operation.at)
    : editor.selection

  if (!at) {
    // Unable to remove decorator without a selection
    return
  }

  if (Range.isExpanded(at)) {
    const rangeRef = Editor.rangeRef(editor, at, {affinity: 'inward'})

    // Split text nodes at range boundaries (equivalent to setNodes with split:true and empty props)
    const [decoratorLeaf] = Editor.leaf(editor, at.anchor)
    if (
      !(
        Range.isCollapsed(at) &&
        Text.isText(decoratorLeaf, editor.schema) &&
        decoratorLeaf.text.length > 0
      )
    ) {
      const [start, end] = Range.edges(at)
      const endAtEndOfNode = Editor.isEnd(editor, end, end.path)
      if (!endAtEndOfNode || !Editor.isEdge(editor, end, end.path)) {
        const [endNode] = Editor.node(editor, end.path)
        editor.apply({
          type: 'split_node',
          path: end.path,
          position: end.offset,
          properties: Node.extractProps(endNode, editor.schema),
        })
      }
      const startAtStartOfNode = Editor.isStart(editor, start, start.path)
      if (!startAtStartOfNode || !Editor.isEdge(editor, start, start.path)) {
        const [startNode] = Editor.node(editor, start.path)
        editor.apply({
          type: 'split_node',
          path: start.path,
          position: start.offset,
          properties: Node.extractProps(startNode, editor.schema),
        })
      }
    }

    const updatedAt = rangeRef.unref()

    if (updatedAt) {
      const splitTextNodes = [
        ...Editor.nodes(editor, {
          at: updatedAt,
          match: (n) => Text.isText(n, editor.schema),
        }),
      ]
      splitTextNodes.forEach(([node, path]) => {
        const [block] = Editor.node(editor, path.slice(0, 1))
        if (
          Element.isElement(block, editor.schema) &&
          block.children.includes(node)
        ) {
          applySetNode(
            editor,
            {
              marks: (Array.isArray(node.marks) ? node.marks : []).filter(
                (eMark: string) => eMark !== mark,
              ),
              _type: context.schema.span.name,
            },
            path,
          )
        }
      })
    }
  } else {
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

      for (const [, spanPath] of Editor.nodes(editor, {
        at: blockPath,
        match: (node) => editor.isTextSpan(node),
      })) {
        applySetNode(editor, {marks: existingMarksWithoutDecorator}, spanPath)
      }
    } else {
      editor.decoratorState[mark] = false
    }
  }

  if (editor.selection) {
    // Reselect
    const selection = editor.selection
    editor.selection = {...selection}
  }
}
