import type {PortableTextBlock} from '@portabletext/schema'
import {applySelect} from '../internal-utils/apply-selection'
import {applySetNode} from '../internal-utils/apply-set-node'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {safeStringify} from '../internal-utils/safe-json'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {Editor, Node, Range, Text} from '../slate'
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

  if (!effectiveSelection || Range.isCollapsed(effectiveSelection)) {
    return
  }

  // Track the range across mutations when `at` is explicitly provided
  const rangeRef = at ? Editor.rangeRef(editor, at, {affinity: 'inward'}) : null

  const selectedBlocks = Editor.nodes(editor, {
    at: effectiveSelection,
    match: (node) => editor.isTextBlock(node),
    reverse: Range.isBackward(effectiveSelection),
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
    if (splitRange && Range.isRange(splitRange)) {
      const [splitLeaf] = Editor.leaf(editor, splitRange.anchor)
      if (
        !(
          Range.isCollapsed(splitRange) &&
          Text.isText(splitLeaf, editor.schema) &&
          splitLeaf.text.length > 0
        )
      ) {
        const splitRangeRef = Editor.rangeRef(editor, splitRange, {
          affinity: 'inward',
        })
        const [splitStart, splitEnd] = Range.edges(splitRange)
        const endAtEnd = Editor.isEnd(editor, splitEnd, splitEnd.path)
        if (!endAtEnd || !Editor.isEdge(editor, splitEnd, splitEnd.path)) {
          const [endNode] = Editor.node(editor, splitEnd.path)
          applySplitNode(
            editor,
            splitEnd.path,
            splitEnd.offset,
            Node.extractProps(endNode, editor.schema),
          )
        }
        const startAtStart = Editor.isStart(editor, splitStart, splitStart.path)
        if (
          !startAtStart ||
          !Editor.isEdge(editor, splitStart, splitStart.path)
        ) {
          const [startNode] = Editor.node(editor, splitStart.path)
          applySplitNode(
            editor,
            splitStart.path,
            splitStart.offset,
            Node.extractProps(startNode, editor.schema),
          )
        }
        // Update selection if using editor.selection (not explicit `at`)
        const updatedSplitRange = splitRangeRef.unref()
        if (!at && updatedSplitRange) {
          applySelect(editor, updatedSplitRange)
        }
      }
    }

    const children = Node.children(editor, blockPath, editor.schema)

    // Use the tracked range (updated after splits) or fall back to editor.selection
    const selectionRange = rangeRef?.current ?? editor.selection

    for (const [span, path] of children) {
      if (!editor.isTextSpan(span)) {
        continue
      }

      if (!selectionRange || !Range.includes(selectionRange, path)) {
        continue
      }

      const marks = span.marks ?? []

      applySetNode(editor, {marks: [...marks, annotationKey]}, path)
    }

    blockIndex++
  }

  // Clean up the range ref
  rangeRef?.unref()
}
