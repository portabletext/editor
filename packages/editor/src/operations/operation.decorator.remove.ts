import type {PortableTextBlock} from '@portabletext/schema'
import {applySetNode} from '../internal-utils/apply-set-node'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {Element, Range, Text} from '../slate'
import {isEdge} from '../slate/editor/is-edge'
import {isEnd} from '../slate/editor/is-end'
import {isStart} from '../slate/editor/is-start'
import {leaf} from '../slate/editor/leaf'
import {node as editorNode} from '../slate/editor/node'
import {nodes} from '../slate/editor/nodes'
import {rangeRef} from '../slate/editor/range-ref'
import {extractProps} from '../slate/node/extract-props'
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
          value: operation.editor.children as Array<PortableTextBlock>,
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
    const ref = rangeRef(editor, at, {affinity: 'inward'})

    // Split text nodes at range boundaries (equivalent to setNodes with split:true and empty props)
    const [decoratorLeaf] = leaf(editor, at.anchor)
    if (
      !(
        Range.isCollapsed(at) &&
        Text.isText(decoratorLeaf, editor.schema) &&
        decoratorLeaf.text.length > 0
      )
    ) {
      const [start, end] = Range.edges(at)
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
    }

    const updatedAt = ref.unref()

    if (updatedAt) {
      const splitTextNodes = [
        ...nodes(editor, {
          at: updatedAt,
          match: (n) => Text.isText(n, editor.schema),
        }),
      ]
      splitTextNodes.forEach(([node, path]) => {
        const block = editor.children[path[0]!]
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

      for (const [, spanPath] of nodes(editor, {
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
