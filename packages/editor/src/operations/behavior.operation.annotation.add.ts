import {Editor, Node, Range, Text, Transforms} from 'slate'
import {parseAnnotation} from '../internal-utils/parse-blocks'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const addAnnotationOperationImplementation: BehaviorOperationImplementation<
  'annotation.add'
> = ({context, operation}) => {
  const parsedAnnotation = parseAnnotation({
    annotation: {
      _type: operation.annotation.name,
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

  if (!editor.selection || Range.isCollapsed(editor.selection)) {
    return
  }

  const selectedBlocks = Editor.nodes(editor, {
    at: editor.selection,
    match: (node) => editor.isTextBlock(node),
    reverse: Range.isBackward(editor.selection),
  })

  let blockIndex = 0

  for (const [block, blockPath] of selectedBlocks) {
    if (block.children.length === 0) {
      continue
    }

    if (block.children.length === 1 && block.children[0].text === '') {
      continue
    }

    // Make sure we don't generate more keys than needed
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

    Transforms.setNodes(editor, {}, {match: Text.isText, split: true})

    const children = Node.children(editor, blockPath)

    for (const [span, path] of children) {
      if (!editor.isTextSpan(span)) {
        continue
      }

      if (!Range.includes(editor.selection, path)) {
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
}
