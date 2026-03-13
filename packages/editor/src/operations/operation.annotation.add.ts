import type {PortableTextBlock} from '@portabletext/schema'
import {applySelect} from '../internal-utils/apply-selection'
import {applySetNode} from '../internal-utils/apply-set-node'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {safeStringify} from '../internal-utils/safe-json'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {isEdge} from '../slate/editor/is-edge'
import {isEnd} from '../slate/editor/is-end'
import {isStart} from '../slate/editor/is-start'
import {leaf} from '../slate/editor/leaf'
import {node as editorNode} from '../slate/editor/node'
import {nodes} from '../slate/editor/nodes'
import {rangeRef} from '../slate/editor/range-ref'
import {extractProps} from '../slate/node/extract-props'
import {getChildren} from '../slate/node/get-children'
import {isBackwardRange} from '../slate/range/is-backward-range'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import {isRange} from '../slate/range/is-range'
import {rangeEdges} from '../slate/range/range-edges'
import {rangeIncludes} from '../slate/range/range-includes'
import {isText} from '../slate/text/is-text'
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
    ? toSlateRange({
        context: {
          schema: context.schema,
          value: operation.editor.children as Array<PortableTextBlock>,
          selection: operation.at,
        },
        blockIndexMap: operation.editor.blockIndexMap,
      })
    : null

  const effectiveSelection = at ?? editor.selection

  if (!effectiveSelection || isCollapsedRange(effectiveSelection)) {
    return
  }

  // Track the range across mutations when `at` is explicitly provided
  const ref = at ? rangeRef(editor, at, {affinity: 'inward'}) : null

  const selectedBlocks = nodes(editor, {
    at: effectiveSelection,
    match: (node) => editor.isTextBlock(node),
    reverse: isBackwardRange(effectiveSelection),
  })

  let blockIndex = 0

  for (const [block, blockPath] of selectedBlocks) {
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
      applySetNode(
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
      const [splitLeaf] = leaf(editor, splitRange.anchor)
      if (
        !(
          isCollapsedRange(splitRange) &&
          isText(splitLeaf, editor.schema) &&
          splitLeaf.text.length > 0
        )
      ) {
        const splitRangeRef = rangeRef(editor, splitRange, {
          affinity: 'inward',
        })
        const [splitStart, splitEnd] = rangeEdges(splitRange)
        const endAtEnd = isEnd(editor, splitEnd, splitEnd.path)
        if (!endAtEnd || !isEdge(editor, splitEnd, splitEnd.path)) {
          const [endNode] = editorNode(editor, splitEnd.path)
          applySplitNode(
            editor,
            splitEnd.path,
            splitEnd.offset,
            extractProps(endNode, editor.schema),
          )
        }
        const startAtStart = isStart(editor, splitStart, splitStart.path)
        if (!startAtStart || !isEdge(editor, splitStart, splitStart.path)) {
          const [startNode] = editorNode(editor, splitStart.path)
          applySplitNode(
            editor,
            splitStart.path,
            splitStart.offset,
            extractProps(startNode, editor.schema),
          )
        }
        // Update selection if using editor.selection (not explicit `at`)
        const updatedSplitRange = splitRangeRef.unref()
        if (!at && updatedSplitRange) {
          applySelect(editor, updatedSplitRange)
        }
      }
    }

    const children = getChildren(editor, blockPath, editor.schema)

    // Use the tracked range (updated after splits) or fall back to editor.selection
    const selectionRange = ref?.current ?? editor.selection

    for (const [span, path] of children) {
      if (!editor.isTextSpan(span)) {
        continue
      }

      if (!selectionRange || !rangeIncludes(selectionRange, path)) {
        continue
      }

      const marks = span.marks ?? []

      applySetNode(editor, {marks: [...marks, annotationKey]}, path)
    }

    blockIndex++
  }

  // Clean up the range ref
  ref?.unref()
}
