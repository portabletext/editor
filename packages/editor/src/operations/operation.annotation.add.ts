import {toSlateRange} from '../internal-utils/to-slate-range'
import {Editor, Node, Range, Text, Transforms} from '../slate'
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
      Transforms.setNodes(
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
        {at: blockPath},
      )
    }

    // When `at` is explicitly provided, use it for the split
    // Otherwise, use the editor's current selection (original behavior)
    if (at) {
      Transforms.setNodes(editor, {}, {match: Text.isText, split: true, at})
    } else {
      Transforms.setNodes(editor, {}, {match: Text.isText, split: true})
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

      Transforms.setNodes(
        editor,
        {
          marks: [...marks, annotationKey],
        },
        {at: path},
      )
    }

    blockIndex++
  }

  // Clean up the range ref
  rangeRef?.unref()
}
