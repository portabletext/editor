import {resolveSelection} from '../internal-utils/apply-selection'
import {getAncestorTextBlock} from '../node-traversal/get-ancestor-text-block'
import {getHighestObjectNode} from '../node-traversal/get-highest-object-node'
import {getNode} from '../node-traversal/get-node'
import {getNodes} from '../node-traversal/get-nodes'
import {getParent} from '../node-traversal/get-parent'
import {getSpanNode} from '../node-traversal/get-span-node'
import {isBlock} from '../node-traversal/is-block'
import {isInline} from '../node-traversal/is-inline'
import {deleteText} from '../slate/core/delete-text'
import {DOMEditor} from '../slate/dom/plugin/dom-editor'
import {end as editorEnd} from '../slate/editor/end'
import {pathRef} from '../slate/editor/path-ref'
import {pointRef} from '../slate/editor/point-ref'
import {positions as editorPositions} from '../slate/editor/positions'
import {range as editorRange} from '../slate/editor/range'
import {start as editorStart} from '../slate/editor/start'
import type {Editor} from '../slate/interfaces/editor'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import type {Range} from '../slate/interfaces/range'
import {isTextBlockNode} from '../slate/node/is-text-block-node'
import {isVoidNode} from '../slate/node/is-void-node'
import {commonPath} from '../slate/path/common-path'
import {comparePaths} from '../slate/path/compare-paths'
import {isAncestorPath} from '../slate/path/is-ancestor-path'
import {isCommonPath} from '../slate/path/is-common-path'
import {parentPath} from '../slate/path/parent-path'
import {pathEquals} from '../slate/path/path-equals'
import {pointEquals} from '../slate/point/point-equals'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import {rangeEdges} from '../slate/range/range-edges'
import {rangeEnd} from '../slate/range/range-end'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import type {OperationImplementation} from './operation.types'

export const deleteOperationImplementation: OperationImplementation<
  'delete'
> = ({context, operation}) => {
  const at = operation.at
    ? resolveSelection(operation.editor, operation.at)
    : operation.editor.selection

  if (!at) {
    throw new Error('Unable to delete without a selection')
  }

  const [start, end] = rangeEdges(at, {}, operation.editor)

  if (operation.unit === 'block') {
    const startBlockSegment = start.path.at(0)
    const endBlockSegment = end.path.at(0)

    if (startBlockSegment === undefined || endBlockSegment === undefined) {
      throw new Error('Failed to get start or end block segment')
    }

    const removeRange = {
      anchor: {path: [startBlockSegment], offset: 0},
      focus: {path: [endBlockSegment], offset: 0},
    }
    const removeRangeEdges = rangeEdges(removeRange, {}, operation.editor)
    const blockMatches: Array<{node: Node; path: Path}> = []
    let lastHighestPath: Path | undefined

    for (const entry of getNodes(operation.editor, {
      from: removeRangeEdges[0].path,
      to: removeRangeEdges[1].path,
    })) {
      const {path: entryPath} = entry

      if (lastHighestPath && isAncestorPath(lastHighestPath, entryPath)) {
        continue
      }

      if (isBlock(operation.editor, entryPath)) {
        lastHighestPath = entryPath
        blockMatches.push(entry)
      }
    }
    const blockPathRefs = Array.from(blockMatches, (entry) =>
      pathRef(operation.editor, entry.path),
    )
    for (const pathRef of blockPathRefs) {
      const path = pathRef.unref()!
      if (path) {
        const nodeEntry = getNode(operation.editor, path)
        if (nodeEntry) {
          operation.editor.apply({
            type: 'unset',
            path,
          })
        }
      }
    }

    return
  }

  if (operation.unit === 'child') {
    const childMatches = getNodes(operation.editor, {
      from: start.path,
      to: end.path,
      match: (_node, path) => isInline(operation.editor, path),
    })
    const childPathRefs = Array.from(childMatches, (entry) =>
      pathRef(operation.editor, entry.path),
    )
    for (const pathRef of childPathRefs) {
      const path = pathRef.unref()!
      if (path) {
        const nodeEntry2 = getNode(operation.editor, path)
        if (nodeEntry2) {
          operation.editor.apply({
            type: 'unset',
            path,
          })
        }
      }
    }

    return
  }

  if (operation.direction === 'backward' && operation.unit === 'line') {
    const parentBlockEntry = pathEquals(at.anchor.path, at.focus.path)
      ? getAncestorTextBlock(operation.editor, at.anchor.path)
      : (() => {
          const fromPath = commonPath(at.anchor.path, at.focus.path)
          const nodeEntry = getNode(operation.editor, fromPath)
          if (
            nodeEntry &&
            isTextBlockNode({schema: operation.editor.schema}, nodeEntry.node)
          ) {
            return nodeEntry
          }
          return getAncestorTextBlock(operation.editor, fromPath)
        })()

    if (parentBlockEntry) {
      const parentBlockPath = parentBlockEntry.path
      const parentElementRange = editorRange(
        operation.editor,
        parentBlockPath,
        at.anchor,
      )

      const currentLineRange = findCurrentLineRange(
        operation.editor,
        parentElementRange,
      )

      if (!isCollapsedRange(currentLineRange)) {
        deleteText(operation.editor, {at: currentLineRange})
        return
      }
    }
  }

  if (operation.unit === 'word') {
    if (isCollapsedRange(at)) {
      deleteText(operation.editor, {
        at,
        unit: 'word',
        reverse: operation.direction === 'backward',
      })

      return
    }
  }

  if (isCollapsedRange(at) && start.path.length >= 2) {
    const nodeEntry = getNode(operation.editor, start.path)
    if (nodeEntry) {
      const {node, path: nodePath} = nodeEntry
      if (isVoidNode(operation.editor, node, nodePath)) {
        operation.editor.apply({
          type: 'unset',
          path: nodePath,
        })
        return
      }
    }
  }

  // Editor.above only checks ancestors, so for top-level ObjectNodes
  // we also check the node at the point directly.
  const startNodeEntry: {node: Node; path: Path} | undefined = (() => {
    const blockSegment = start.path.at(0)
    if (blockSegment !== undefined) {
      const entry = getNode(operation.editor, [blockSegment])
      if (entry && isVoidNode(operation.editor, entry.node, [blockSegment])) {
        return entry
      }
    }
    return undefined
  })()
  const endNodeEntry: {node: Node; path: Path} | undefined = (() => {
    const blockSegment = end.path.at(0)
    if (blockSegment !== undefined) {
      const entry = getNode(operation.editor, [blockSegment])
      if (entry && isVoidNode(operation.editor, entry.node, [blockSegment])) {
        return entry
      }
    }
    return undefined
  })()

  const startBlock = startNodeEntry ?? getParent(operation.editor, start.path)
  const endBlock = endNodeEntry ?? getParent(operation.editor, end.path)
  const isAcrossBlocks =
    startBlock && endBlock && !pathEquals(startBlock.path, endBlock.path)

  // Cross-parent range: the two end blocks live under different parents (e.g. a
  // root text block and a line inside an editable container). Slate's merge
  // logic assumes siblings at the same level, so we delete partial content at
  // each end, unset any fully-contained blocks in between, and leave the two
  // block shells behind without merging.
  if (
    startBlock &&
    endBlock &&
    isAcrossBlocks &&
    !pathEquals(parentPath(startBlock.path), parentPath(endBlock.path))
  ) {
    const startBlockEndPoint = editorEnd(operation.editor, startBlock.path)
    const endBlockStartPoint = editorStart(operation.editor, endBlock.path)

    const intermediateBlockRefs: Array<ReturnType<typeof pathRef>> = []
    for (const entry of getNodes(operation.editor, {
      from: startBlockEndPoint.path,
      to: endBlockStartPoint.path,
      match: (_node, path) => isBlock(operation.editor, path),
    })) {
      if (
        isAncestorPath(entry.path, startBlock.path) ||
        isAncestorPath(entry.path, endBlock.path) ||
        pathEquals(entry.path, startBlock.path) ||
        pathEquals(entry.path, endBlock.path)
      ) {
        continue
      }
      intermediateBlockRefs.push(pathRef(operation.editor, entry.path))
    }

    const startRef = pointRef(operation.editor, start)

    if (!pointEquals(end, endBlockStartPoint)) {
      deleteText(operation.editor, {
        at: {anchor: endBlockStartPoint, focus: end},
        hanging: true,
      })
    }

    for (const ref of intermediateBlockRefs.reverse()) {
      const path = ref.unref()
      if (path) {
        operation.editor.apply({type: 'unset', path})
      }
    }

    if (!pointEquals(start, startBlockEndPoint)) {
      deleteText(operation.editor, {
        at: {anchor: start, focus: startBlockEndPoint},
        hanging: true,
      })
    }

    const collapsedPoint = startRef.unref()
    if (collapsedPoint && operation.editor.selection) {
      operation.editor.apply({
        type: 'set_selection',
        properties: operation.editor.selection,
        newProperties: {
          anchor: collapsedPoint,
          focus: collapsedPoint,
        },
      })
    }

    return
  }

  const startObjectNode =
    startBlock && isVoidNode(operation.editor, startBlock.node, startBlock.path)
      ? startBlock
      : undefined
  const endObjectNode =
    endBlock && isVoidNode(operation.editor, endBlock.node, endBlock.path)
      ? endBlock
      : undefined

  const startNonEditable =
    startObjectNode ?? getHighestObjectNode(operation.editor, start.path)
  const endNonEditable =
    endObjectNode ?? getHighestObjectNode(operation.editor, end.path)

  const matches: Array<{node: Node; path: Path}> = []
  let lastPath: Path | undefined

  for (const entry of getNodes(operation.editor, {
    from: start.path,
    to: end.path,
  })) {
    const {node, path: entryPath} = entry

    if (lastPath && comparePaths(entryPath, lastPath, operation.editor) === 0) {
      continue
    }

    if (
      isVoidNode(operation.editor, node, entryPath) ||
      (!isCommonPath(entryPath, start.path) &&
        !isCommonPath(entryPath, end.path))
    ) {
      matches.push(entry)
      lastPath = entryPath
    }
  }

  const pathRefs = Array.from(matches, (entry) =>
    pathRef(operation.editor, entry.path),
  )
  const startRef = pointRef(operation.editor, start)
  const endRef = pointRef(operation.editor, end)

  const endToEndSelection =
    startBlock &&
    endBlock &&
    pointEquals(start, editorStart(operation.editor, startBlock.path)) &&
    pointEquals(end, editorEnd(operation.editor, endBlock.path))

  if (endToEndSelection && isAcrossBlocks) {
    if (!startNonEditable) {
      const point = startRef.current!
      const nodeEntry = getSpanNode(operation.editor, point.path)

      if (nodeEntry) {
        const node = nodeEntry.node
        if (node.text.length > 0) {
          operation.editor.apply({
            type: 'remove_text',
            path: point.path,
            offset: 0,
            text: node.text,
          })
        }
      }
    }

    for (const pathRef of pathRefs.reverse()) {
      const path = pathRef.unref()

      if (path) {
        const nodeAtPathEntry = getNode(operation.editor, path)
        if (nodeAtPathEntry) {
          operation.editor.apply({
            type: 'unset',
            path,
          })
        }
      }
    }

    if (!endNonEditable) {
      const point = endRef.current!
      const nodeEntry = getSpanNode(operation.editor, point.path)

      if (nodeEntry) {
        const node = nodeEntry.node
        const {path} = point
        const offset = 0
        const text = node.text.slice(offset, end.offset)

        if (text.length > 0) {
          operation.editor.apply({type: 'remove_text', path, offset, text})
        }
      }
    }

    if (endRef.current && startRef.current) {
      const endBlockMatches = getNodes(operation.editor, {
        from: endRef.current.path,
        to: endRef.current.path,
        match: (_node, path) => isBlock(operation.editor, path),
      })
      const endBlockPathRefs = Array.from(endBlockMatches, (entry) =>
        pathRef(operation.editor, entry.path),
      )
      for (const pathRef of endBlockPathRefs) {
        const endPath = pathRef.unref()!
        if (endPath) {
          const endNodeEntry = getNode(operation.editor, endPath)
          if (endNodeEntry) {
            operation.editor.apply({
              type: 'unset',
              path: endPath,
            })
          }
        }
      }
    }

    if (startRef.current && operation.editor.selection) {
      operation.editor.apply({
        type: 'set_selection',
        properties: operation.editor.selection,
        newProperties: {
          anchor: startRef.current,
          focus: startRef.current,
        },
      })
    }

    return
  }

  if (
    startNonEditable &&
    startBlock &&
    endBlock &&
    pathEquals(startBlock.path, endBlock.path) &&
    isVoidNode(operation.editor, startBlock.node, startBlock.path)
  ) {
    const path = startBlock.path
    operation.editor.apply({
      type: 'unset',
      path,
    })

    return
  }

  // Remove ObjectNodes before calling deleteText since they're atomic.
  let removedEndObjectNode = false
  for (const pathRef of [...pathRefs].reverse()) {
    const currentPath = pathRef.current

    if (currentPath) {
      const nodeAtPathEntry2 = getNode(operation.editor, currentPath)

      if (
        nodeAtPathEntry2 &&
        isVoidNode(operation.editor, nodeAtPathEntry2.node, currentPath)
      ) {
        const path = pathRef.unref()

        if (path) {
          if (endObjectNode && pathEquals(path, endObjectNode.path)) {
            removedEndObjectNode = true
          }
          operation.editor.apply({
            type: 'unset',
            path,
          })
        }
      }
    }
  }

  // Reconstruct the range from point refs since removal may have shifted paths.
  // Clamp to the start block if the end ObjectNode was removed.
  const updatedStart = startRef.current
  const updatedEnd = endRef.current
  const updatedAt = (() => {
    if (!updatedStart) {
      // The start point was invalidated (e.g., the start node was removed).
      // If we have an end point, delete from the start of the end block to
      // the end point.
      if (updatedEnd) {
        const endBlockStart = editorStart(operation.editor, [
          updatedEnd.path.at(0)!,
        ])
        return {anchor: endBlockStart, focus: updatedEnd}
      }
      return at
    }

    const startBlockSegment = updatedStart.path.at(0)
    const endBlockSegment = updatedEnd?.path.at(0)
    const isCrossBlock =
      isKeyedSegment(startBlockSegment) && isKeyedSegment(endBlockSegment)
        ? startBlockSegment._key !== endBlockSegment._key
        : startBlockSegment !== endBlockSegment

    if (removedEndObjectNode && (!updatedEnd || isCrossBlock)) {
      const startBlockEnd = editorEnd(operation.editor, [
        updatedStart.path.at(0)!,
      ])
      return {anchor: updatedStart, focus: startBlockEnd}
    }

    if (!updatedEnd) {
      return at
    }

    return {anchor: updatedStart, focus: updatedEnd}
  })()

  const reverse = operation.direction === 'backward'
  const hanging = reverse
    ? end
      ? isTextBlockNode(context, endBlock?.node)
        ? end.offset === 0
        : true
      : false
    : start
      ? isTextBlockNode(context, startBlock?.node)
        ? start.offset === 0
        : true
      : false

  if (removedEndObjectNode) {
    deleteText(operation.editor, {
      at: updatedAt,
      reverse,
    })

    if (operation.editor.selection && startRef.current) {
      operation.editor.apply({
        type: 'set_selection',
        properties: operation.editor.selection,
        newProperties: {
          anchor: startRef.current,
          focus: startRef.current,
        },
      })
    }
  } else if (operation.at || !updatedStart) {
    // Pass updatedAt explicitly when:
    // - operation.at was provided (use the updated range)
    // - updatedStart is null (start node was removed, editor.selection is stale)
    deleteText(operation.editor, {
      at: updatedAt,
      hanging,
      reverse,
    })

    // When the start node was removed, the editor selection may still span
    // across blocks (the anchor shifted to a different node). Collapse the
    // selection to the start of the remaining range.
    if (!updatedStart && updatedEnd && operation.editor.selection) {
      const collapsedPoint = editorStart(operation.editor, [
        updatedEnd.path.at(0)!,
      ])
      operation.editor.apply({
        type: 'set_selection',
        properties: operation.editor.selection,
        newProperties: {
          anchor: collapsedPoint,
          focus: collapsedPoint,
        },
      })
    }
  } else {
    deleteText(operation.editor, {
      hanging,
      reverse,
    })
  }
}

function findCurrentLineRange(
  editor: PortableTextSlateEditor,
  parentRange: Range,
): Range {
  const parentRangeBoundary = editorRange(editor, rangeEnd(parentRange, editor))
  const positions = Array.from(editorPositions(editor, {at: parentRange}))

  let left = 0
  let right = positions.length
  let middle = Math.floor(right / 2)

  if (
    rangesAreOnSameLine(
      editor,
      editorRange(editor, positions[left]!),
      parentRangeBoundary,
    )
  ) {
    return editorRange(editor, positions[left]!, parentRangeBoundary)
  }

  if (positions.length < 2) {
    return editorRange(
      editor,
      positions[positions.length - 1]!,
      parentRangeBoundary,
    )
  }

  while (middle !== positions.length && middle !== left) {
    if (
      rangesAreOnSameLine(
        editor,
        editorRange(editor, positions[middle]!),
        parentRangeBoundary,
      )
    ) {
      right = middle
    } else {
      left = middle
    }

    middle = Math.floor((left + right) / 2)
  }

  return editorRange(editor, positions[left]!, parentRangeBoundary)
}

function rangesAreOnSameLine(editor: Editor, range1: Range, range2: Range) {
  const rect1 = DOMEditor.toDOMRange(editor, range1).getBoundingClientRect()
  const rect2 = DOMEditor.toDOMRange(editor, range2).getBoundingClientRect()

  return domRectsIntersect(rect1, rect2) && domRectsIntersect(rect2, rect1)
}

function domRectsIntersect(rect: DOMRect, compareRect: DOMRect) {
  const middle = (compareRect.top + compareRect.bottom) / 2

  return rect.top <= middle && rect.bottom >= middle
}
