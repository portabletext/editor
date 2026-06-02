import {isSpan, isTextBlock} from '@portabletext/schema'
import {isEdge} from '../engine/editor/is-edge'
import {isEnd} from '../engine/editor/is-end'
import {isStart} from '../engine/editor/is-start'
import {rangeRef} from '../engine/editor/range-ref'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import {parentPath} from '../engine/path/parent-path'
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {isExpandedRange} from '../engine/range/is-expanded-range'
import {rangeEdges} from '../engine/range/range-edges'
import {rangeEnd} from '../engine/range/range-end'
import {rangeStart} from '../engine/range/range-start'
import {resolveSelection} from '../internal-utils/apply-selection'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {getNode} from '../traversal/get-node'
import {getNodes} from '../traversal/get-nodes'
import {getParent} from '../traversal/get-parent'
import type {OperationImplementation} from './operation.types'

export const decoratorRemoveOperationImplementation: OperationImplementation<
  'decorator.remove'
> = ({snapshot, operation}) => {
  const {context} = snapshot
  const editor = operation.editor
  const mark = operation.decorator
  const at = operation.at
    ? resolveSelection(operation.editor, operation.at)
    : editor.snapshot.context.selection

  if (!at) {
    // Unable to remove decorator without a selection
    return
  }

  if (isExpandedRange(at)) {
    const ref = rangeRef(editor, at, {affinity: 'inward'})

    withoutNormalizing(editor, () => {
      // Split text nodes at range boundaries (equivalent to setNodes with split:true and empty props)
      const decoratorLeaf = getNode(editor.snapshot, at!.anchor.path)?.node
      if (
        !(
          decoratorLeaf &&
          isCollapsedRange(at) &&
          isSpan({schema: editor.snapshot.context.schema}, decoratorLeaf) &&
          decoratorLeaf.text.length > 0
        )
      ) {
        const [start, end] = rangeEdges(at, editor.snapshot.context)
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
          ...getNodes(editor.snapshot, {
            from: rangeStart(updatedAt, editor.snapshot.context).path,
            to: rangeEnd(updatedAt, editor.snapshot.context).path,
            match: (n) => isSpan({schema: editor.snapshot.context.schema}, n),
          }),
        ]
        for (const {node, path: nodePath} of splitTextNodes) {
          if (!isSpan({schema: editor.snapshot.context.schema}, node)) {
            continue
          }

          const blockPath = parentPath(nodePath)
          const blockEntry = getNode(editor.snapshot, blockPath)
          const block = blockEntry?.node
          if (
            isTextBlock({schema: editor.snapshot.context.schema}, block) &&
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
    const textBlockEntry = getParent(snapshot, at.focus.path, {
      match: (node) =>
        isTextBlock({schema: editor.snapshot.context.schema}, node),
    })
    if (!textBlockEntry) {
      return
    }
    const {node: block, path: blockPath} = textBlockEntry
    const lonelyEmptySpan =
      block.children.length === 1 &&
      isSpan({schema: editor.snapshot.context.schema}, block.children[0]) &&
      block.children[0].text === ''
        ? block.children[0]
        : undefined

    if (lonelyEmptySpan) {
      const existingMarks = lonelyEmptySpan.marks ?? []
      const existingMarksWithoutDecorator = existingMarks.filter(
        (existingMark) => existingMark !== mark,
      )

      for (const {path: spanPath} of Array.from(
        getNodes(editor.snapshot, {
          at: blockPath,
          match: (node) =>
            isSpan({schema: editor.snapshot.context.schema}, node),
        }),
      )) {
        setNodeProperties(
          editor,
          {marks: existingMarksWithoutDecorator},
          spanPath,
        )
      }
    } else {
      editor.snapshot.decoratorState[mark] = false
    }
  }

  if (editor.snapshot.context.selection) {
    // Reselect
    const selection = editor.snapshot.context.selection
    editor.snapshot.context.selection = {...selection}
  }
}
