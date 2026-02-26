import {applySetNode} from '../internal-utils/apply-set-node'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {Editor, Element, Node, Range, Text} from '../slate'
import type {OperationImplementation} from './operation.types'

export const decoratorRemoveOperationImplementation: OperationImplementation<
  'decorator.remove'
> = ({context, operation}) => {
  const editor = operation.editor
  const mark = operation.decorator
  const at = operation.at
    ? toSlateRange({
        context: {
          schema: context.schema,
          value: operation.editor.value,
          selection: operation.at,
        },
        blockIndexMap: operation.editor.blockIndexMap,
      })
    : editor.selection

  if (!at) {
    // Unable to remove decorator without a selection
    return
  }

  if (Range.isExpanded(at)) {
    const rangeRef = Editor.rangeRef(editor, at, {affinity: 'inward'})

    // Split text nodes at range boundaries (equivalent to setNodes with split:true and empty props)
    if (
      !(
        Range.isCollapsed(at) &&
        Editor.leaf(editor, at.anchor)[0].text.length > 0
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
    }

    const updatedAt = rangeRef.unref()

    if (updatedAt) {
      const splitTextNodes = [
        ...Editor.nodes(editor, {
          at: updatedAt,
          match: Text.isText,
        }),
      ]
      splitTextNodes.forEach(([node, path]) => {
        const block = editor.children[path[0]!]
        if (Element.isElement(block) && block.children.includes(node)) {
          applySetNode(
            editor,
            {
              marks: (Array.isArray(node.marks) ? node.marks : []).filter(
                (eMark: string) => eMark !== mark,
              ),
              _type: 'span',
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
