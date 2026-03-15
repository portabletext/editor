import type {PortableTextBlock} from '@portabletext/schema'
import {isSpan, isTextBlock} from '@portabletext/schema'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {deleteText} from '../slate/core/delete-text'
import {DOMEditor} from '../slate/dom/plugin/dom-editor'
import {above} from '../slate/editor/above'
import {elementReadOnly} from '../slate/editor/element-read-only'
import {end as editorEnd} from '../slate/editor/end'
import {getVoid} from '../slate/editor/get-void'
import {isBlock} from '../slate/editor/is-block'
import {node as editorNode} from '../slate/editor/node'
import {nodes} from '../slate/editor/nodes'
import {pathRef} from '../slate/editor/path-ref'
import {pointRef} from '../slate/editor/point-ref'
import {positions as editorPositions} from '../slate/editor/positions'
import {range as editorRange} from '../slate/editor/range'
import {start as editorStart} from '../slate/editor/start'
import {isElement} from '../slate/element/is-element'
import type {Editor} from '../slate/interfaces/editor'
import type {NodeEntry} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import type {Range} from '../slate/interfaces/range'
import {getNode} from '../slate/node/get-node'
import {comparePaths} from '../slate/path/compare-paths'
import {isCommonPath} from '../slate/path/is-common-path'
import {pathEquals} from '../slate/path/path-equals'
import {pointEquals} from '../slate/point/point-equals'
import {isCollapsedRange} from '../slate/range/is-collapsed-range'
import {rangeEdges} from '../slate/range/range-edges'
import {rangeEnd} from '../slate/range/range-end'
import {isText} from '../slate/text/is-text'
import type {PortableTextSlateEditor} from '../types/slate-editor'
import type {OperationImplementation} from './operation.types'

export const deleteOperationImplementation: OperationImplementation<
  'delete'
> = ({context, operation}) => {
  const at = operation.at
    ? toSlateRange({
        context: {
          schema: context.schema,
          value: operation.editor.children as Array<PortableTextBlock>,
          selection: operation.at,
        },
        blockIndexMap: operation.editor.blockIndexMap,
      })
    : operation.editor.selection

  if (!at) {
    throw new Error('Unable to delete without a selection')
  }

  const [start, end] = rangeEdges(at)

  if (operation.unit === 'block') {
    const startBlockIndex = start.path.at(0)
    const endBlockIndex = end.path.at(0)

    if (startBlockIndex === undefined || endBlockIndex === undefined) {
      throw new Error('Failed to get start or end block index')
    }

    const removeRange = {
      anchor: {path: [startBlockIndex], offset: 0},
      focus: {path: [endBlockIndex], offset: 0},
    }
    const blockMatches = nodes(operation.editor, {
      at: removeRange,
      match: (n) =>
        (isElement(n, operation.editor.schema) &&
          isBlock(operation.editor, n)) ||
        operation.editor.isObjectNode(n),
      mode: 'highest',
    })
    const blockPathRefs = Array.from(blockMatches, ([, p]) =>
      pathRef(operation.editor, p),
    )
    for (const pathRef of blockPathRefs) {
      const path = pathRef.unref()!
      if (path) {
        const [node] = editorNode(operation.editor, path)
        operation.editor.apply({type: 'remove_node', path, node})
      }
    }

    return
  }

  if (operation.unit === 'child') {
    const childMatches = nodes(operation.editor, {
      at,
      match: (node, path) =>
        isSpan(context, node) ||
        (isElement(node, operation.editor.schema) &&
          operation.editor.isInline(node)) ||
        // TODO: Update depth check when containers land (path.length > 1 assumes flat structure)
        (operation.editor.isObjectNode(node) && path.length > 1),
    })
    const childPathRefs = Array.from(childMatches, ([, p]) =>
      pathRef(operation.editor, p),
    )
    for (const pathRef of childPathRefs) {
      const path = pathRef.unref()!
      if (path) {
        const [node] = editorNode(operation.editor, path)
        operation.editor.apply({type: 'remove_node', path, node})
      }
    }

    return
  }

  if (operation.direction === 'backward' && operation.unit === 'line') {
    const parentBlockEntry = above(operation.editor, {
      match: (n) =>
        isElement(n, operation.editor.schema) && isBlock(operation.editor, n),
      at,
    })

    if (parentBlockEntry) {
      const [, parentBlockPath] = parentBlockEntry
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
    try {
      const node = getNode(
        operation.editor,
        start.path,
        operation.editor.schema,
      )
      if (operation.editor.isObjectNode(node)) {
        operation.editor.apply({
          type: 'remove_node',
          path: start.path,
          node,
        })
        return
      }
    } catch {
      // Fall through to normal handling
    }
  }

  // Editor.above only checks ancestors, so for top-level ObjectNodes
  // we also check the node at the point directly.
  const startNodeEntry: NodeEntry | undefined = (() => {
    const blockIndex = start.path.at(0)
    if (blockIndex !== undefined) {
      const node = getNode(
        operation.editor,
        [blockIndex],
        operation.editor.schema,
      )
      if (operation.editor.isObjectNode(node)) {
        return [node, [blockIndex]]
      }
    }
    return undefined
  })()
  const endNodeEntry: NodeEntry | undefined = (() => {
    const blockIndex = end.path.at(0)
    if (blockIndex !== undefined) {
      const node = getNode(
        operation.editor,
        [blockIndex],
        operation.editor.schema,
      )
      if (operation.editor.isObjectNode(node)) {
        return [node, [blockIndex]]
      }
    }
    return undefined
  })()

  const startBlock =
    startNodeEntry ??
    above(operation.editor, {
      match: (n) =>
        (isElement(n, operation.editor.schema) &&
          isBlock(operation.editor, n)) ||
        operation.editor.isObjectNode(n),
      at: start,
      voids: false,
    })
  const endBlock =
    endNodeEntry ??
    above(operation.editor, {
      match: (n) =>
        (isElement(n, operation.editor.schema) &&
          isBlock(operation.editor, n)) ||
        operation.editor.isObjectNode(n),
      at: end,
      voids: false,
    })
  const isAcrossBlocks =
    startBlock && endBlock && !pathEquals(startBlock[1], endBlock[1])

  const startObjectNode =
    startBlock && operation.editor.isObjectNode(startBlock[0])
      ? startBlock
      : undefined
  const endObjectNode =
    endBlock && operation.editor.isObjectNode(endBlock[0])
      ? endBlock
      : undefined

  const startNonEditable =
    startObjectNode ??
    getVoid(operation.editor, {at: start, mode: 'highest'}) ??
    elementReadOnly(operation.editor, {at: start, mode: 'highest'})
  const endNonEditable =
    endObjectNode ??
    getVoid(operation.editor, {at: end, mode: 'highest'}) ??
    elementReadOnly(operation.editor, {at: end, mode: 'highest'})

  const matches: NodeEntry[] = []
  let lastPath: Path | undefined

  for (const entry of nodes(operation.editor, {at, voids: false})) {
    const [node, path] = entry

    if (lastPath && comparePaths(path, lastPath) === 0) {
      continue
    }

    if (
      operation.editor.isObjectNode(node) ||
      (isElement(node, operation.editor.schema) &&
        operation.editor.isElementReadOnly(node)) ||
      (!isCommonPath(path, start.path) && !isCommonPath(path, end.path))
    ) {
      matches.push(entry)
      lastPath = path
    }
  }

  const pathRefs = Array.from(matches, ([, path]) =>
    pathRef(operation.editor, path),
  )
  const startRef = pointRef(operation.editor, start)
  const endRef = pointRef(operation.editor, end)

  const endToEndSelection =
    startBlock &&
    endBlock &&
    pointEquals(start, editorStart(operation.editor, startBlock[1])) &&
    pointEquals(end, editorEnd(operation.editor, endBlock[1]))

  if (endToEndSelection && isAcrossBlocks) {
    if (!startNonEditable) {
      const point = startRef.current!
      const node = getNode(
        operation.editor,
        point.path,
        operation.editor.schema,
      )

      if (isText(node, operation.editor.schema) && node.text.length > 0) {
        operation.editor.apply({
          type: 'remove_text',
          path: point.path,
          offset: 0,
          text: node.text,
        })
      }
    }

    for (const pathRef of pathRefs.reverse()) {
      const path = pathRef.unref()

      if (path) {
        const [nodeAtPath] = editorNode(operation.editor, path)
        operation.editor.apply({type: 'remove_node', path, node: nodeAtPath})
      }
    }

    if (!endNonEditable) {
      const point = endRef.current!
      const node = getNode(
        operation.editor,
        point.path,
        operation.editor.schema,
      )

      if (isText(node, operation.editor.schema)) {
        const {path} = point
        const offset = 0
        const text = node.text.slice(offset, end.offset)

        if (text.length > 0) {
          operation.editor.apply({type: 'remove_text', path, offset, text})
        }
      }
    }

    if (endRef.current && startRef.current) {
      const endBlockMatches = nodes(operation.editor, {
        at: endRef.current,
        match: (n) =>
          (isElement(n, operation.editor.schema) &&
            isBlock(operation.editor, n)) ||
          operation.editor.isObjectNode(n),
      })
      const endBlockPathRefs = Array.from(endBlockMatches, ([, p]) =>
        pathRef(operation.editor, p),
      )
      for (const pathRef of endBlockPathRefs) {
        const endPath = pathRef.unref()!
        if (endPath) {
          const [endNode] = editorNode(operation.editor, endPath)
          operation.editor.apply({
            type: 'remove_node',
            path: endPath,
            node: endNode,
          })
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
    pathEquals(startBlock[1], endBlock[1]) &&
    operation.editor.isObjectNode(startBlock[0])
  ) {
    const path = startBlock[1]
    operation.editor.apply({
      type: 'remove_node',
      path,
      node: startBlock[0],
    })

    return
  }

  // Remove ObjectNodes before calling deleteText since they're atomic.
  let removedEndObjectNode = false
  for (const pathRef of [...pathRefs].reverse()) {
    const currentPath = pathRef.current

    if (currentPath) {
      const [nodeAtPath] = editorNode(operation.editor, currentPath)

      if (operation.editor.isObjectNode(nodeAtPath)) {
        const path = pathRef.unref()

        if (path) {
          if (endObjectNode && pathEquals(path, endObjectNode[1])) {
            removedEndObjectNode = true
          }
          operation.editor.apply({type: 'remove_node', path, node: nodeAtPath})
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
      return at
    }

    if (
      removedEndObjectNode &&
      (!updatedEnd || updatedStart.path.at(0) !== updatedEnd.path.at(0))
    ) {
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
      ? isTextBlock(context, endBlock)
        ? end.offset === 0
        : true
      : false
    : start
      ? isTextBlock(context, startBlock)
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
  } else if (operation.at) {
    deleteText(operation.editor, {
      at: updatedAt,
      hanging,
      reverse,
    })
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
  const parentRangeBoundary = editorRange(editor, rangeEnd(parentRange))
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
