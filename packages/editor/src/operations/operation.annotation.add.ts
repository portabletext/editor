import {applySelect} from '../internal-utils/apply-selection'
import {applySetNode} from '../internal-utils/apply-set-node'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {Editor, Node, Range} from '../slate'
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
      `Failed to parse annotation ${JSON.stringify(operation.annotation)}`,
    )
  }

  const editor = operation.editor

  const at = operation.at
    ? toSlateRange({
        context: {
          schema: context.schema,
          value: operation.editor.value,
          selection: operation.at,
        },
        blockPathMap: operation.editor.blockPathMap,
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
      if (
        !(
          Range.isCollapsed(splitRange) &&
          Editor.leaf(editor, splitRange.anchor)[0].text.length > 0
        )
      ) {
        const splitRangeRef = Editor.rangeRef(editor, splitRange, {
          affinity: 'inward',
        })
        const [splitStart, splitEnd] = Range.edges(splitRange)
        const endAtEnd = Editor.isEnd(editor, splitEnd, splitEnd.path)
        if (!endAtEnd || !Editor.isEdge(editor, splitEnd, splitEnd.path)) {
          const [endNode] = Editor.node(editor, splitEnd.path)
          editor.apply({
            type: 'split_node',
            path: splitEnd.path,
            position: splitEnd.offset,
            properties: Node.extractProps(endNode),
          })
        }
        const startAtStart = Editor.isStart(editor, splitStart, splitStart.path)
        if (
          !startAtStart ||
          !Editor.isEdge(editor, splitStart, splitStart.path)
        ) {
          const [startNode] = Editor.node(editor, splitStart.path)
          editor.apply({
            type: 'split_node',
            path: splitStart.path,
            position: splitStart.offset,
            properties: Node.extractProps(startNode),
          })
        }
        // Update selection if using editor.selection (not explicit `at`)
        const updatedSplitRange = splitRangeRef.unref()
        if (!at && updatedSplitRange) {
          applySelect(editor, updatedSplitRange)
        }
      }
    }

    const children = Node.children(editor, blockPath)

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
