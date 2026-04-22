import {isSpan, isTextBlock} from '@portabletext/schema'
import {resolveSelection} from '../internal-utils/apply-selection'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import {getNode} from '../node-traversal/get-node'
import {getNodes} from '../node-traversal/get-nodes'
import {isLeaf} from '../node-traversal/is-leaf'
import {isEdge} from '../slate/editor/is-edge'
import {isEnd} from '../slate/editor/is-end'
import {isStart} from '../slate/editor/is-start'
import {rangeRef} from '../slate/editor/range-ref'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import {parentPath} from '../slate/path/parent-path'
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
    ? resolveSelection(operation.editor, operation.at)
    : editor.selection

  if (!at) {
    // Unable to remove decorator without a selection
    return
  }

  if (isExpandedRange(at)) {
    const ref = rangeRef(editor, at, {affinity: 'inward'})

    withoutNormalizing(editor, () => {
      // Split text nodes at range boundaries (equivalent to setNodes with split:true and empty props)
      const decoratorLeafEntry = getNode(editor, at!.anchor.path)
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
        const [start, end] = rangeEdges(at, {}, editor)
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
            from: rangeStart(updatedAt, editor).path,
            to: rangeEnd(updatedAt, editor).path,
            match: (n) => isSpan({schema: editor.schema}, n),
          }),
        ]
        for (const {node, path: nodePath} of splitTextNodes) {
          if (!isSpan({schema: editor.schema}, node)) {
            continue
          }

          const blockPath = parentPath(nodePath)
          const blockEntry = getNode(editor, blockPath)
          const block = blockEntry?.node
          if (
            isTextBlock({schema: editor.schema}, block) &&
            block.children.includes(node)
          ) {
            setNodeProperties(
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
    }) // end withoutNormalizing
  } else {
    const textBlockEntry = getAncestorTextBlock(context, at.focus.path)
    if (!textBlockEntry) {
      return
    }
    const {node: block, path: blockPath} = textBlockEntry
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

      for (const {path: spanPath} of Array.from(
        getNodes(editor, {
          at: blockPath,
          match: (node) => isSpan({schema: editor.schema}, node),
        }),
      )) {
        setNodeProperties(
          editor,
          {marks: existingMarksWithoutDecorator},
          spanPath,
        )
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
