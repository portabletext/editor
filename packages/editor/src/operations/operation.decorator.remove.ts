import {isSpan, isTextBlock} from '@portabletext/schema'
import {applySetNode} from '../internal-utils/apply-set-node'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {isEdge} from '../slate/editor/is-edge'
import {isEnd} from '../slate/editor/is-end'
import {isStart} from '../slate/editor/is-start'
import {leaf} from '../slate/editor/leaf'
import {node as editorNode} from '../slate/editor/node'
import {nodes} from '../slate/editor/nodes'
import {rangeRef} from '../slate/editor/range-ref'
import {extractProps} from '../slate/node/extract-props'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import {isExpandedRange} from '../slate/range/is-expanded-range'
import {rangeEdges} from '../slate/range/range-edges'
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
          value: operation.editor.children,
          selection: operation.at,
        },
        blockIndexMap: operation.editor.blockIndexMap,
      })
    : editor.selection

  if (!at) {
    // Unable to remove decorator without a selection
    return
  }

  if (isExpandedRange(at)) {
    const ref = rangeRef(editor, at, {affinity: 'inward'})

    // Split text nodes at range boundaries (equivalent to setNodes with split:true and empty props)
    const [decoratorLeaf] = leaf(editor, at.anchor)
    if (
      !(
        isCollapsedRange(at) &&
        isSpan({schema: editor.schema}, decoratorLeaf) &&
        decoratorLeaf.text.length > 0
      )
    ) {
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
    }

    const updatedAt = ref.unref()

    if (updatedAt) {
      const splitTextNodes = [
        ...nodes(editor, {
          at: updatedAt,
          match: (n) => isSpan({schema: editor.schema}, n),
        }),
      ]
      splitTextNodes.forEach(([node, path]) => {
        const block = editor.children[path[0]!]
        if (
          isTextBlock({schema: editor.schema}, block) &&
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
      isTextBlock({schema: editor.schema}, block) &&
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

      for (const [, spanPath] of nodes(editor, {
        at: blockPath,
        match: (node) => isSpan({schema: editor.schema}, node),
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
