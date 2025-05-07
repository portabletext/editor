import type {Path} from '@sanity/types'
import {Editor, Node, Range, Text, Transforms} from 'slate'
import {parseAnnotation} from '../internal-utils/parse-blocks'
import type {BehaviorOperationImplementation} from './behavior.operations'

/**
 * @public
 */
export type AddedAnnotationPaths = {
  /**
   * @deprecated An annotation may be applied to multiple blocks, resulting
   * in multiple `markDef`'s being created. Use `markDefPaths` instead.
   */
  markDefPath: Path
  markDefPaths: Array<Path>
  /**
   * @deprecated Does not return anything meaningful since an annotation
   * can span multiple blocks and spans. If references the span closest
   * to the focus point of the selection.
   */
  spanPath: Path
}

export const addAnnotationOperationImplementation: BehaviorOperationImplementation<
  'annotation.add',
  AddedAnnotationPaths | undefined
> = ({context, operation}) => {
  const parsedAnnotation = parseAnnotation({
    annotation: {
      _type: operation.annotation.name,
      ...operation.annotation.value,
    },
    context,
    options: {refreshKeys: false, validateFields: true},
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

  let paths: AddedAnnotationPaths | undefined = undefined
  let spanPath: Path | undefined
  let markDefPath: Path | undefined
  const markDefPaths: Path[] = []

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

      markDefPath = [{_key: block._key}, 'markDefs', {_key: annotationKey}]

      if (Range.isBackward(editor.selection)) {
        markDefPaths.unshift(markDefPath)
      } else {
        markDefPaths.push(markDefPath)
      }
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
      const existingSameTypeAnnotations = marks.filter((mark) =>
        markDefs.some(
          (markDef) =>
            markDef._key === mark && markDef._type === parsedAnnotation._type,
        ),
      )

      Transforms.setNodes(
        editor,
        {
          marks: [
            ...marks.filter(
              (mark) => !existingSameTypeAnnotations.includes(mark),
            ),
            annotationKey,
          ],
        },
        {at: path},
      )

      spanPath = [{_key: block._key}, 'children', {_key: span._key}]
    }

    blockIndex++
  }

  if (markDefPath && spanPath) {
    paths = {
      markDefPath,
      markDefPaths,
      spanPath,
    }
  }

  return paths
}
