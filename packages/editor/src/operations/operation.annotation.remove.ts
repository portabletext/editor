import type {PortableTextSpan} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {isEdge} from '../engine/editor/is-edge'
import {isEnd} from '../engine/editor/is-end'
import {isStart} from '../engine/editor/is-start'
import {rangeRef} from '../engine/editor/range-ref'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import type {Path} from '../engine/interfaces/path'
import {isAfterPath} from '../engine/path/is-after-path'
import {isBeforePath} from '../engine/path/is-before-path'
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {isRange} from '../engine/range/is-range'
import {rangeEdges} from '../engine/range/range-edges'
import {rangeEnd} from '../engine/range/range-end'
import {rangeStart} from '../engine/range/range-start'
import {applySelect, resolveSelection} from '../internal-utils/apply-selection'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {getChildren} from '../traversal/get-children'
import {getNode} from '../traversal/get-node'
import {getNodes} from '../traversal/get-nodes'
import {getParent} from '../traversal/get-parent'
import {rangeContains} from '../traversal/range-contains'
import type {OperationImplementation} from './operation.types'

export const removeAnnotationOperationImplementation: OperationImplementation<
  'annotation.remove'
> = ({snapshot, operation}) => {
  const editor = operation.editor

  const at = operation.at
    ? resolveSelection(operation.editor, operation.at)
    : null

  const effectiveSelection = at ?? editor.snapshot.context.selection

  if (!effectiveSelection) {
    return
  }

  if (isCollapsedRange(effectiveSelection)) {
    const blockEntry = getParent(snapshot, effectiveSelection.focus.path, {
      match: (node) =>
        isTextBlock({schema: editor.snapshot.context.schema}, node),
    })

    if (!blockEntry) {
      return
    }

    const {node: block, path: blockPath} = blockEntry

    const markDefs = block.markDefs ?? []
    const potentialAnnotations = markDefs.filter(
      (markDef) => markDef._type === operation.annotation.name,
    )

    const selectedChildEntry = getNode(
      editor.snapshot,
      effectiveSelection.focus.path,
    )

    if (!selectedChildEntry) {
      return
    }

    const {node: selectedChild, path: selectedChildPath} = selectedChildEntry

    if (!isSpan({schema: editor.snapshot.context.schema}, selectedChild)) {
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

    const reversedChildren = getChildren(editor.snapshot, blockPath)

    for (let index = reversedChildren.length - 1; index >= 0; index--) {
      const entry = reversedChildren[index]
      if (!entry) {
        continue
      }
      const {node: child, path: childPath} = entry
      if (!isSpan({schema: editor.snapshot.context.schema}, child)) {
        continue
      }

      if (
        !isBeforePath(childPath, selectedChildPath, editor.snapshot.context)
      ) {
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

    for (const {node: child, path: childPath} of getChildren(
      editor.snapshot,
      blockPath,
    )) {
      if (!isSpan({schema: editor.snapshot.context.schema}, child)) {
        continue
      }

      if (!isAfterPath(childPath, selectedChildPath, editor.snapshot.context)) {
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
      [selectedChild, selectedChildPath] satisfies [PortableTextSpan, Path],
      ...nextSpansWithSameAnnotation,
    ]) {
      setNodeProperties(
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

    withoutNormalizing(editor, () => {
      // Split text nodes at range boundaries
      const splitRange = at ?? editor.snapshot.context.selection
      if (splitRange && isRange(splitRange)) {
        const splitLeaf = getNode(editor.snapshot, splitRange.anchor.path)?.node
        if (
          !(
            splitLeaf &&
            isCollapsedRange(splitRange) &&
            isSpan({schema: editor.snapshot.context.schema}, splitLeaf) &&
            splitLeaf.text.length > 0
          )
        ) {
          const splitRangeRef = rangeRef(editor, splitRange, {
            affinity: 'inward',
          })
          const [splitStart, splitEnd] = rangeEdges(
            splitRange,
            editor.snapshot.context,
          )
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

      const blocks = Array.from(
        getNodes(editor.snapshot, {
          from: rangeStart(effectiveSelection, editor.snapshot.context).path,
          to: rangeEnd(effectiveSelection, editor.snapshot.context).path,
          match: (node) =>
            isTextBlock({schema: editor.snapshot.context.schema}, node),
        }),
      )

      // Use the tracked range (updated after splits) or fall back to editor.selection
      const selectionRange = ref?.current ?? editor.snapshot.context.selection

      for (const {node: block, path: blockPath} of blocks) {
        if (!isTextBlock({schema: editor.snapshot.context.schema}, block)) {
          continue
        }

        const children = getChildren(editor.snapshot, blockPath)

        for (const {node: child, path: childPath} of children) {
          if (!isSpan({schema: editor.snapshot.context.schema}, child)) {
            continue
          }

          if (
            !selectionRange ||
            !rangeContains(editor.snapshot, selectionRange, childPath)
          ) {
            continue
          }

          const markDefs = block.markDefs ?? []
          const marks = child.marks ?? []
          const marksWithoutAnnotation = marks.filter((mark) => {
            const markDef = markDefs.find((markDef) => markDef._key === mark)
            return markDef?._type !== operation.annotation.name
          })

          if (marksWithoutAnnotation.length !== marks.length) {
            setNodeProperties(
              editor,
              {marks: marksWithoutAnnotation},
              childPath,
            )
          }
        }
      }
    }) // end withoutNormalizing

    // Clean up the range ref
    ref?.unref()
  }
}
