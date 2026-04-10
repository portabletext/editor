import {isSpan, isTextBlock} from '@portabletext/schema'
import {applySelect, resolveSelection} from '../internal-utils/apply-selection'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {safeStringify} from '../internal-utils/safe-json'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {getChildren} from '../node-traversal/get-children'
import {getNode} from '../node-traversal/get-node'
import {getNodes} from '../node-traversal/get-nodes'
import {isLeaf} from '../node-traversal/is-leaf'
import {isEdge} from '../slate/editor/is-edge'
import {isEnd} from '../slate/editor/is-end'
import {isStart} from '../slate/editor/is-start'
import {rangeRef} from '../slate/editor/range-ref'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import {isBackwardRange} from '../slate/range/is-backward-range'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import {isRange} from '../slate/range/is-range'
import {rangeEdges} from '../slate/range/range-edges'
import {rangeEnd} from '../slate/range/range-end'
import {rangeIncludes} from '../slate/range/range-includes'
import {rangeStart} from '../slate/range/range-start'
import {parseAnnotation} from '../utils/parse-blocks'
import type {OperationImplementation} from './operation.types'

export const addAnnotationOperationImplementation: OperationImplementation<
  'annotation.add'
> = ({context, operation}) => {
  const parsedAnnotation = parseAnnotation({
    annotation: {
      _type: operation.annotation.name,
      _key: operation.annotation._key,
      ...operation.annotation.value,
    },
    context,
    options: {validateFields: true},
  })

  if (!parsedAnnotation) {
    throw new Error(
      `Failed to parse annotation ${safeStringify(operation.annotation)}`,
    )
  }

  const editor = operation.editor

  const at = operation.at
    ? resolveSelection(operation.editor, operation.at)
    : null

  const effectiveSelection = at ?? editor.selection

  if (!effectiveSelection || isCollapsedRange(effectiveSelection)) {
    return
  }

  // Track the range across mutations when `at` is explicitly provided
  const ref = at ? rangeRef(editor, at, {affinity: 'inward'}) : null

  const selectedBlocks = Array.from(
    getNodes(editor, {
      from: rangeStart(effectiveSelection, editor).path,
      to: rangeEnd(effectiveSelection, editor).path,
      match: (node) => isTextBlock({schema: editor.schema}, node),
      reverse: isBackwardRange(effectiveSelection, editor),
    }),
  )

  let blockIndex = 0

  withoutNormalizing(editor, () => {
    for (const {node: block, path: blockPath} of selectedBlocks) {
      if (!isTextBlock({schema: editor.schema}, block)) {
        continue
      }

      if (block.children.length === 0) {
        continue
      }

      if (block.children.length === 1 && block.children[0]?.text === '') {
        continue
      }

      const annotationKey =
        blockIndex === 0 ? parsedAnnotation._key : context.keyGenerator()
      const markDefs = block.markDefs ?? []
      const existingMarkDef = markDefs.find(
        (markDef) =>
          markDef._type === parsedAnnotation._type &&
          markDef._key === annotationKey,
      )

      if (existingMarkDef === undefined) {
        setNodeProperties(
          editor,
          {
            markDefs: [
              ...markDefs,
              {
                ...parsedAnnotation,
                _key: annotationKey,
              },
            ],
          },
          blockPath,
        )
      }

      // Split text nodes at range boundaries
      const splitRange = at ?? editor.selection
      if (splitRange && isRange(splitRange)) {
        const splitLeafEntry = getNode(editor, splitRange.anchor.path)
        const splitLeaf =
          splitLeafEntry && isLeaf(editor, splitLeafEntry.path)
            ? splitLeafEntry.node
            : undefined
        if (
          !(
            splitLeaf &&
            isCollapsedRange(splitRange) &&
            isSpan({schema: editor.schema}, splitLeaf) &&
            splitLeaf.text.length > 0
          )
        ) {
          const splitRangeRef = rangeRef(editor, splitRange, {
            affinity: 'inward',
          })
          const [splitStart, splitEnd] = rangeEdges(splitRange, {}, editor)
          const endAtEnd = isEnd(editor, splitEnd, splitEnd.path)
          if (!endAtEnd || !isEdge(editor, splitEnd, splitEnd.path)) {
            applySplitNode(editor, splitEnd.path, splitEnd.offset)
          }
          const startAtStart = isStart(editor, splitStart, splitStart.path)
          if (!startAtStart || !isEdge(editor, splitStart, splitStart.path)) {
            applySplitNode(editor, splitStart.path, splitStart.offset)
          }
          // Update selection if using editor.selection (not explicit `at`)
          const updatedSplitRange = splitRangeRef.unref()
          if (!at && updatedSplitRange) {
            applySelect(editor, updatedSplitRange)
          }
        }
      }

      const children = getChildren(editor, blockPath)

      // Use the tracked range (updated after splits) or fall back to editor.selection
      const selectionRange = ref?.current ?? editor.selection

      for (const {node: span, path: spanPath} of children) {
        if (!isSpan({schema: editor.schema}, span)) {
          continue
        }

        if (
          !selectionRange ||
          !rangeIncludes(selectionRange, spanPath, editor)
        ) {
          continue
        }

        const marks = span.marks ?? []

        setNodeProperties(editor, {marks: [...marks, annotationKey]}, spanPath)
      }

      blockIndex++
    }
  }) // end withoutNormalizing

  // Clean up the range ref
  ref?.unref()
}
