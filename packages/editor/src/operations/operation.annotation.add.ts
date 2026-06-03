import {isSpan, isTextBlock} from '@portabletext/schema'
import {isEdge} from '../engine/editor/is-edge'
import {isEnd} from '../engine/editor/is-end'
import {isStart} from '../engine/editor/is-start'
import {rangeRef} from '../engine/editor/range-ref'
import {withoutNormalizing} from '../engine/editor/without-normalizing'
import {isBackwardRange} from '../engine/range/is-backward-range'
import {isCollapsedRange} from '../engine/range/is-collapsed-range'
import {isRange} from '../engine/range/is-range'
import {rangeEdges} from '../engine/range/range-edges'
import {rangeEnd} from '../engine/range/range-end'
import {rangeStart} from '../engine/range/range-start'
import {applySelect, resolveSelection} from '../internal-utils/apply-selection'
import {applySplitNode} from '../internal-utils/apply-split-node'
import {safeStringify} from '../internal-utils/safe-json'
import {setNodeProperties} from '../internal-utils/set-node-properties'
import {getChildren} from '../traversal/get-children'
import {getNode} from '../traversal/get-node'
import {getNodes} from '../traversal/get-nodes'
import {getPathSubSchema} from '../traversal/get-path-sub-schema'
import {rangeIntersects} from '../traversal/range-intersects'
import {parseAnnotation} from '../utils/parse-blocks'
import type {OperationImplementation} from './operation.types'

export const addAnnotationOperationImplementation: OperationImplementation<
  'annotation.add'
> = ({snapshot, operation}) => {
  const {context} = snapshot
  const editor = operation.editor

  const at = operation.at
    ? resolveSelection(operation.editor, operation.at)
    : null

  const effectiveSelection = at ?? editor.snapshot.context.selection

  const anchorPath = effectiveSelection?.anchor.path
  const annotationSchema = anchorPath
    ? getPathSubSchema(snapshot, anchorPath)
    : context.schema
  const parsedAnnotation = parseAnnotation({
    annotation: {
      _type: operation.annotation.name,
      _key: operation.annotation._key,
      ...operation.annotation.value,
    },
    schema: annotationSchema,
    keyGenerator: context.keyGenerator,
    options: {validateFields: true},
  })

  if (!parsedAnnotation) {
    throw new Error(
      `Failed to parse annotation ${safeStringify(operation.annotation)}`,
    )
  }

  if (!effectiveSelection || isCollapsedRange(effectiveSelection)) {
    return
  }

  // Track the range across mutations when `at` is explicitly provided
  const ref = at ? rangeRef(editor, at, {affinity: 'inward'}) : null

  const selectedBlocks = Array.from(
    getNodes(editor.snapshot, {
      from: rangeStart(effectiveSelection, editor.snapshot.context).path,
      to: rangeEnd(effectiveSelection, editor.snapshot.context).path,
      match: (node) =>
        isTextBlock({schema: editor.snapshot.context.schema}, node),
      reverse: isBackwardRange(effectiveSelection, editor.snapshot.context),
    }),
  )

  let blockIndex = 0

  withoutNormalizing(editor, () => {
    for (const {node: block, path: blockPath} of selectedBlocks) {
      if (!isTextBlock({schema: editor.snapshot.context.schema}, block)) {
        continue
      }

      if (block.children.length === 0) {
        continue
      }

      if (block.children.length === 1 && block.children[0]?.text === '') {
        continue
      }

      // The sub-schema at the block path is authoritative: skip blocks
      // whose schema doesn't declare this annotation type.
      const subSchema = getPathSubSchema(snapshot, blockPath)
      if (
        !subSchema.annotations.some(
          (annotation) => annotation.name === parsedAnnotation._type,
        )
      ) {
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
        setNodeProperties(
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

      const children = getChildren(editor.snapshot, blockPath)

      // Use the tracked range (updated after splits) or fall back to editor.selection
      const selectionRange = ref?.current ?? editor.snapshot.context.selection

      for (const {node: span, path: spanPath} of children) {
        if (!isSpan({schema: editor.snapshot.context.schema}, span)) {
          continue
        }

        if (
          !selectionRange ||
          !rangeIntersects(editor.snapshot, selectionRange, spanPath)
        ) {
          continue
        }

        const marks = span.marks ?? []

        setNodeProperties(editor, {marks: [...marks, annotationKey]}, spanPath)
      }

      blockIndex++
    }
  }) // end withoutNormalizing

  // Clean up the range ref
  ref?.unref()
}
