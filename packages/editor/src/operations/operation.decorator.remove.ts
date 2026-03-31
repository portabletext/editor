import {isSpan, isTextBlock} from '@portabletext/schema'
import {applySetNode} from '../internal-utils/apply-set-node'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {getNode} from '../node-traversal/get-node'
import {getNodes} from '../node-traversal/get-nodes'
import {isLeaf} from '../node-traversal/is-leaf'
import {isEdge} from '../slate/editor/is-edge'
import {isEnd} from '../slate/editor/is-end'
import {isStart} from '../slate/editor/is-start'
import {path as editorPath} from '../slate/editor/path'
import {rangeRef} from '../slate/editor/range-ref'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import {isExpandedRange} from '../slate/range/is-expanded-range'
import {rangeEdges} from '../slate/range/range-edges'
import {rangeEnd} from '../slate/range/range-end'
import {rangeStart} from '../slate/range/range-start'
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
    const decoratorLeafEntry = getNode(editor, at.anchor.path)
    const decoratorLeaf =
      decoratorLeafEntry && isLeaf(editor, decoratorLeafEntry.path)
        ? decoratorLeafEntry.node
        : undefined
    if (
      !(
        decoratorLeaf &&
        isCollapsedRange(at) &&
        isSpan({schema: editor.schema}, decoratorLeaf) &&
        decoratorLeaf.text.length > 0
      )
    ) {
      const [start, end] = rangeEdges(at)
      const endAtEndOfNode = isEnd(editor, end, end.path)
      if (!endAtEndOfNode || !isEdge(editor, end, end.path)) {
        applySplitNode(editor, end.path, end.offset)
      }
      const startAtStartOfNode = isStart(editor, start, start.path)
      if (!startAtStartOfNode || !isEdge(editor, start, start.path)) {
        applySplitNode(editor, start.path, start.offset)
      }
    }

    const updatedAt = ref.unref()

    if (updatedAt) {
      const splitTextNodes = [
        ...getNodes(editor, {
          from: rangeStart(updatedAt).path,
          to: rangeEnd(updatedAt).path,
          match: (n) => isSpan({schema: editor.schema}, n),
        }),
      ]
      for (const {node, path: nodePath} of splitTextNodes) {
        if (!isSpan({schema: editor.schema}, node)) {
          continue
        }

        const block = editor.children[nodePath[0]!]
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
            nodePath,
          )
        }
      }
    }
  } else {
    const blockEntry = getNode(editor, editorPath(editor, at, {depth: 1}))
    if (!blockEntry) {
      return
    }
    const {node: block, path: blockPath} = blockEntry
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

      for (const {path: spanPath} of Array.from(
        getNodes(editor, {
          at: blockPath,
          match: (node) => isSpan({schema: editor.schema}, node),
        }),
      )) {
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
