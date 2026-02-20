import type {PortableTextSpan} from '@portabletext/schema'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {Editor, Node, Path, Range, Transforms} from '../slate'
import type {OperationImplementation} from './operation.types'

export const removeAnnotationOperationImplementation: OperationImplementation<
  'annotation.remove'
> = ({context, operation}) => {
  const editor = operation.editor

  const at = operation.at
    ? toSlateRange({
        context: {
          schema: context.schema,
          value: operation.editor.children,
          selection: operation.at,
        },
        blockIndexMap: operation.editor.blockIndexMap,
      })
    : null

  const effectiveSelection = at ?? editor.selection

  if (!effectiveSelection) {
    return
  }

  if (Range.isCollapsed(effectiveSelection)) {
    const [block, blockPath] = Editor.node(editor, effectiveSelection, {
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
      effectiveSelection,
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
    // Track the range across mutations when `at` is explicitly provided
    const rangeRef = at
      ? Editor.rangeRef(editor, at, {affinity: 'inward'})
      : null

    // When `at` is explicitly provided, use it for the split
    // Otherwise, use the editor's current selection (original behavior)
    if (at) {
      Transforms.setNodes(
        editor,
        {},
        {
          match: (node) => editor.isTextSpan(node),
          split: true,
          hanging: true,
          at,
        },
      )
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
    }

    const blocks = Editor.nodes(editor, {
      at: effectiveSelection,
      match: (node) => editor.isTextBlock(node),
    })

    // Use the tracked range (updated after splits) or fall back to editor.selection
    const selectionRange = rangeRef?.current ?? editor.selection

    for (const [block, blockPath] of blocks) {
      const children = Node.children(editor, blockPath)

      for (const [child, childPath] of children) {
        if (!editor.isTextSpan(child)) {
          continue
        }

        if (!selectionRange || !Range.includes(selectionRange, childPath)) {
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

    // Clean up the range ref
    rangeRef?.unref()
  }
}
