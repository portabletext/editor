import type {PortableTextSpan} from '@sanity/types'
import {Editor, Node, Path, Range, Transforms} from 'slate'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const removeAnnotationOperationImplementation: BehaviorOperationImplementation<
  'annotation.remove'
> = ({operation}) => {
  const editor = operation.editor

  if (!editor.selection) {
    return
  }

  if (Range.isCollapsed(editor.selection)) {
    const [block, blockPath] = Editor.node(editor, editor.selection, {
      depth: 1,
    })

    if (!editor.isTextBlock(block)) {
      return
    }

    const markDefs = block.markDefs ?? []
    const potentialAnnotations = markDefs.filter(
      (markDef) => markDef._type === operation.annotation.name,
    )

    const [selectedChild, selectedChildPath] = Editor.node(
      editor,
      editor.selection,
      {
        depth: 2,
      },
    )

    if (!editor.isTextSpan(selectedChild)) {
      return
    }

    const annotationToRemove = selectedChild.marks?.find((mark) =>
      potentialAnnotations.some((markDef) => markDef._key === mark),
    )

    if (!annotationToRemove) {
      return
    }

    const previousSpansWithSameAnnotation: Array<
      [span: PortableTextSpan, path: Path]
    > = []

    for (const [child, childPath] of Node.children(editor, blockPath, {
      reverse: true,
    })) {
      if (!editor.isTextSpan(child)) {
        continue
      }

      if (!Path.isBefore(childPath, selectedChildPath)) {
        continue
      }

      if (child.marks?.includes(annotationToRemove)) {
        previousSpansWithSameAnnotation.push([child, childPath])
      } else {
        break
      }
    }

    const nextSpansWithSameAnnotation: Array<
      [span: PortableTextSpan, path: Path]
    > = []

    for (const [child, childPath] of Node.children(editor, blockPath)) {
      if (!editor.isTextSpan(child)) {
        continue
      }

      if (!Path.isAfter(childPath, selectedChildPath)) {
        continue
      }

      if (child.marks?.includes(annotationToRemove)) {
        nextSpansWithSameAnnotation.push([child, childPath])
      } else {
        break
      }
    }

    for (const [child, childPath] of [
      ...previousSpansWithSameAnnotation,
      [selectedChild, selectedChildPath] as const,
      ...nextSpansWithSameAnnotation,
    ]) {
      Transforms.setNodes(
        editor,
        {
          marks: child.marks?.filter((mark) => mark !== annotationToRemove),
        },
        {at: childPath},
      )
    }
  } else {
    Transforms.setNodes(
      editor,
      {},
      {
        match: (node) => editor.isTextSpan(node),
        split: true,
        hanging: true,
      },
    )

    const blocks = Editor.nodes(editor, {
      at: editor.selection,
      match: (node) => editor.isTextBlock(node),
    })

    for (const [block, blockPath] of blocks) {
      const children = Node.children(editor, blockPath)

      for (const [child, childPath] of children) {
        if (!editor.isTextSpan(child)) {
          continue
        }

        if (!Range.includes(editor.selection, childPath)) {
          continue
        }

        const markDefs = block.markDefs ?? []
        const marks = child.marks ?? []
        const marksWithoutAnnotation = marks.filter((mark) => {
          const markDef = markDefs.find((markDef) => markDef._key === mark)
          return markDef?._type !== operation.annotation.name
        })

        if (marksWithoutAnnotation.length !== marks.length) {
          Transforms.setNodes(
            editor,
            {
              marks: marksWithoutAnnotation,
            },
            {at: childPath},
          )
        }
      }
    }
  }
}
