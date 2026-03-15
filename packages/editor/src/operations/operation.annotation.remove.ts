import type {PortableTextBlock, PortableTextSpan} from '@portabletext/schema'
import {applySelect} from '../internal-utils/apply-selection'
import {applySetNode} from '../internal-utils/apply-set-node'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {isEdge} from '../slate/editor/is-edge'
import {isEnd} from '../slate/editor/is-end'
import {isStart} from '../slate/editor/is-start'
import {leaf} from '../slate/editor/leaf'
import {node as editorNode} from '../slate/editor/node'
import {nodes} from '../slate/editor/nodes'
import {rangeRef} from '../slate/editor/range-ref'
import type {Path} from '../slate/interfaces/path'
import {extractProps} from '../slate/node/extract-props'
import {getChildren} from '../slate/node/get-children'
import {isAfterPath} from '../slate/path/is-after-path'
import {isBeforePath} from '../slate/path/is-before-path'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import {isRange} from '../slate/range/is-range'
import {rangeEdges} from '../slate/range/range-edges'
import {rangeIncludes} from '../slate/range/range-includes'
import {isText} from '../slate/text/is-text'
import type {OperationImplementation} from './operation.types'

export const removeAnnotationOperationImplementation: OperationImplementation<
  'annotation.remove'
> = ({context, operation}) => {
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

  if (!effectiveSelection) {
    return
  }

  if (isCollapsedRange(effectiveSelection)) {
    const [block, blockPath] = editorNode(editor, effectiveSelection, {
      depth: 1,
    })

    if (!editor.isTextBlock(block)) {
      return
    }

    const markDefs = block.markDefs ?? []
    const potentialAnnotations = markDefs.filter(
      (markDef) => markDef._type === operation.annotation.name,
    )

    const [selectedChild, selectedChildPath] = editorNode(
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

    for (const [child, childPath] of getChildren(
      editor,
      blockPath,
      editor.schema,
      {
        reverse: true,
      },
    )) {
      if (!editor.isTextSpan(child)) {
        continue
      }

      if (!isBeforePath(childPath, selectedChildPath)) {
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

    for (const [child, childPath] of getChildren(
      editor,
      blockPath,
      editor.schema,
    )) {
      if (!editor.isTextSpan(child)) {
        continue
      }

      if (!isAfterPath(childPath, selectedChildPath)) {
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
      applySetNode(
        editor,
        {
          marks: child.marks?.filter((mark) => mark !== annotationToRemove),
        },
        childPath,
      )
    }
  } else {
    // Track the range across mutations when `at` is explicitly provided
    const ref = at ? rangeRef(editor, at, {affinity: 'inward'}) : null

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

    const blocks = nodes(editor, {
      at: effectiveSelection,
      match: (node) => editor.isTextBlock(node),
    })

    // Use the tracked range (updated after splits) or fall back to editor.selection
    const selectionRange = ref?.current ?? editor.selection

    for (const [block, blockPath] of blocks) {
      const children = getChildren(editor, blockPath, editor.schema)

      for (const [child, childPath] of children) {
        if (!editor.isTextSpan(child)) {
          continue
        }

        if (!selectionRange || !rangeIncludes(selectionRange, childPath)) {
          continue
        }

        const markDefs = block.markDefs ?? []
        const marks = child.marks ?? []
        const marksWithoutAnnotation = marks.filter((mark) => {
          const markDef = markDefs.find((markDef) => markDef._key === mark)
          return markDef?._type !== operation.annotation.name
        })

        if (marksWithoutAnnotation.length !== marks.length) {
          applySetNode(editor, {marks: marksWithoutAnnotation}, childPath)
        }
      }
    }

    // Clean up the range ref
    ref?.unref()
  }
}
