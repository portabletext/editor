import type {PortableTextSpan} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {applySelect, resolveSelection} from '../internal-utils/apply-selection'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {getChildren} from '../node-traversal/get-children'
import {getNode} from '../node-traversal/get-node'
import {getNodes} from '../node-traversal/get-nodes'
import {isLeaf} from '../node-traversal/is-leaf'
import {isEdge} from '../slate/editor/is-edge'
import {isEnd} from '../slate/editor/is-end'
import {isStart} from '../slate/editor/is-start'
import {path as editorPath} from '../slate/editor/path'
import {rangeRef} from '../slate/editor/range-ref'
import {withoutNormalizing} from '../slate/editor/without-normalizing'
import type {Path} from '../slate/interfaces/path'
import {isAfterPath} from '../slate/path/is-after-path'
import {isBeforePath} from '../slate/path/is-before-path'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import {isRange} from '../slate/range/is-range'
import {rangeEdges} from '../slate/range/range-edges'
import {rangeEnd} from '../slate/range/range-end'
import {rangeIncludes} from '../slate/range/range-includes'
import {rangeStart} from '../slate/range/range-start'
import type {OperationImplementation} from './operation.types'

export const removeAnnotationOperationImplementation: OperationImplementation<
  'annotation.remove'
> = ({operation}) => {
  const editor = operation.editor

  const at = operation.at
    ? resolveSelection(operation.editor, operation.at)
    : null

  const effectiveSelection = at ?? editor.selection

  if (!effectiveSelection) {
    return
  }

  if (isCollapsedRange(effectiveSelection)) {
    const blockEntry = getNode(
      editor,
      editorPath(editor, effectiveSelection, {depth: 1}),
    )

    if (!blockEntry) {
      return
    }

    const {node: block, path: blockPath} = blockEntry

    if (!isTextBlock({schema: editor.schema}, block)) {
      return
    }

    const markDefs = block.markDefs ?? []
    const potentialAnnotations = markDefs.filter(
      (markDef) => markDef._type === operation.annotation.name,
    )

    const selectedChildEntry = getNode(
      editor,
      editorPath(editor, effectiveSelection, {depth: 2}),
    )

    if (!selectedChildEntry) {
      return
    }

    const {node: selectedChild, path: selectedChildPath} = selectedChildEntry

    if (!isSpan({schema: editor.schema}, selectedChild)) {
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

    const reversedChildren = getChildren(editor, blockPath)

    for (let index = reversedChildren.length - 1; index >= 0; index--) {
      const entry = reversedChildren[index]
      if (!entry) {
        continue
      }
      const {node: child, path: childPath} = entry
      if (!isSpan({schema: editor.schema}, child)) {
        continue
      }

      if (!isBeforePath(childPath, selectedChildPath, editor)) {
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
      editor,
      blockPath,
    )) {
      if (!isSpan({schema: editor.schema}, child)) {
        continue
      }

      if (!isAfterPath(childPath, selectedChildPath, editor)) {
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
      const splitRange = at ?? editor.selection
      if (splitRange && isRange(splitRange)) {
        const splitLeafEntry = getNode(editor, splitRange.anchor.path)
        const splitLeaf =
          splitLeafEntry && isLeaf(editor, splitLeafEntry.path)
            ? splitLeafEntry.node
            : undefined
        if (
          !(
            splitLeaf &&
            isCollapsedRange(splitRange) &&
            isSpan({schema: editor.schema}, splitLeaf) &&
            splitLeaf.text.length > 0
          )
        ) {
          const splitRangeRef = rangeRef(editor, splitRange, {
            affinity: 'inward',
          })
          const [splitStart, splitEnd] = rangeEdges(splitRange, {}, editor)
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
        getNodes(editor, {
          from: rangeStart(effectiveSelection, editor).path,
          to: rangeEnd(effectiveSelection, editor).path,
          match: (node) => isTextBlock({schema: editor.schema}, node),
        }),
      )

      // Use the tracked range (updated after splits) or fall back to editor.selection
      const selectionRange = ref?.current ?? editor.selection

      for (const {node: block, path: blockPath} of blocks) {
        if (!isTextBlock({schema: editor.schema}, block)) {
          continue
        }

        const children = getChildren(editor, blockPath)

        for (const {node: child, path: childPath} of children) {
          if (!isSpan({schema: editor.schema}, child)) {
            continue
          }

          if (
            !selectionRange ||
            !rangeIncludes(selectionRange, childPath, editor)
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
