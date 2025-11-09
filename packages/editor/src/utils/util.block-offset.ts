import {
  isBlockObject,
  isContainerBlock,
  isSpan,
  isTextBlock,
} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import type {ChildPath} from '../types/paths'
import {getBlockKeyFromSelectionPoint} from './util.selection-point'

/**
 * Converts a block offset to a span selection point.
 *
 * Supports nested container blocks like tables by navigating through the path structure.
 * For example, for a table cell, the blockOffset.path might be:
 * [{_key: tableKey}, 'children', {_key: rowKey}, 'children', {_key: cellKey}]
 *
 * @public
 */
export function blockOffsetToSpanSelectionPoint({
  context,
  blockOffset,
  direction,
}: {
  context: Pick<EditorContext, 'schema' | 'value'>
  blockOffset: BlockOffset
  direction: 'forward' | 'backward'
}) {
  // Find the block in the value using the first keyed segment
  const blockKey =
    typeof blockOffset.path[0] === 'object' && '_key' in blockOffset.path[0]
      ? blockOffset.path[0]._key
      : undefined

  if (!blockKey) {
    return undefined
  }

  // Find the top-level block
  for (const block of context.value) {
    if (block._key !== blockKey) {
      continue
    }

    // Navigate to the target block if blockOffset.path points to a nested container
    let targetBlock = block
    let currentPath = [blockOffset.path[0]]

    // Traverse down through nested container blocks following the path
    for (let i = 1; i < blockOffset.path.length; i += 2) {
      const segment = blockOffset.path[i]

      if (segment !== 'children') {
        break
      }

      const keySegment = blockOffset.path[i + 1]
      if (typeof keySegment !== 'object' || !('_key' in keySegment)) {
        break
      }

      // Navigate into children to find the next block in the path
      if (
        !isContainerBlock(context, targetBlock) ||
        !Array.isArray(targetBlock.children)
      ) {
        return undefined
      }

      const childBlock = targetBlock.children.find(
        (child: any) => child._key === keySegment._key,
      )

      if (!childBlock) {
        return undefined
      }

      // Type assertion: we know this is a container block because we're navigating the path
      targetBlock = childBlock as any
      currentPath = blockOffset.path.slice(0, i + 2)
    }

    return findSpanInBlock({
      context,
      block: targetBlock,
      blockPath: currentPath,
      offset: blockOffset.offset,
      direction,
    })
  }

  return undefined
}

/**
 * Recursively finds a span within a block (or nested container blocks) at the given offset
 */
function findSpanInBlock({
  context,
  block,
  blockPath,
  offset,
  direction,
}: {
  context: Pick<EditorContext, 'schema' | 'value'>
  block: any
  blockPath: any[]
  offset: number
  direction: 'forward' | 'backward'
}): {path: ChildPath; offset: number} | undefined {
  let offsetLeft = offset
  let selectionPoint: {path: ChildPath; offset: number} | undefined
  let skippedInlineObject = false

  // Skip block objects (images, etc) - they don't have text children
  if (isBlockObject(context, block)) {
    return undefined
  }

  // Handle container blocks - recursively traverse to find text blocks
  if (isContainerBlock(context, block)) {
    // Check if this container's children are spans/inline objects or other blocks
    const firstChild = block.children[0]
    const hasSpanChildren =
      firstChild &&
      (isSpan(context, firstChild) ||
        (typeof firstChild === 'object' &&
          '_type' in firstChild &&
          !isContainerBlock(context, firstChild) &&
          !isTextBlock(context, firstChild)))

    // If the container has span/inline object children, treat it like a text block
    if (!hasSpanChildren) {
      // For container blocks with block children, recursively find the text block
      for (const child of block.children) {
        const childResult = findSpanInBlock({
          context,
          block: child,
          blockPath: [...blockPath, 'children', {_key: child._key}],
          offset: offsetLeft,
          direction,
        })

        if (childResult) {
          return childResult
        }
      }
      return undefined
    }
    // If hasSpanChildren, fall through to process spans below
  }

  // At this point, block should be a text block or container with span children
  if (!isTextBlock(context, block) && !isContainerBlock(context, block)) {
    return undefined
  }

  // Iterate through the text block's children (spans and inline objects)
  for (const child of block.children) {
    if (direction === 'forward') {
      if (!isSpan(context, child)) {
        continue
      }

      if (offsetLeft <= child.text.length) {
        selectionPoint = {
          path: [...blockPath, 'children', {_key: child._key}] as ChildPath,
          offset: offsetLeft,
        }
        break
      }

      offsetLeft -= child.text.length

      continue
    }

    if (!isSpan(context, child)) {
      skippedInlineObject = true
      continue
    }

    if (offsetLeft === 0 && selectionPoint && !skippedInlineObject) {
      if (skippedInlineObject) {
        selectionPoint = {
          path: [...blockPath, 'children', {_key: child._key}] as ChildPath,
          offset: 0,
        }
      }
      break
    }

    if (offsetLeft > child.text.length) {
      offsetLeft -= child.text.length
      continue
    }

    if (offsetLeft <= child.text.length) {
      selectionPoint = {
        path: [...blockPath, 'children', {_key: child._key}] as ChildPath,
        offset: offsetLeft,
      }

      offsetLeft -= child.text.length

      if (offsetLeft !== 0) {
        break
      }
    }
  }

  return selectionPoint
}

/**
 * Converts a span selection point to a block offset.
 *
 * Supports nested container blocks like tables by navigating through the path structure.
 * For example, for a table cell span, the selectionPoint.path might be:
 * [{_key: tableKey}, 'children', {_key: rowKey}, 'children', {_key: cellKey}, 'children', {_key: spanKey}]
 * and it will return a blockOffset with path:
 * [{_key: tableKey}, 'children', {_key: rowKey}, 'children', {_key: cellKey}]
 *
 * @public
 */
export function spanSelectionPointToBlockOffset({
  context,
  selectionPoint,
}: {
  context: Pick<EditorContext, 'schema' | 'value'>
  selectionPoint: EditorSelectionPoint
}): BlockOffset | undefined {
  const blockKey = getBlockKeyFromSelectionPoint(selectionPoint)

  if (!blockKey) {
    return undefined
  }

  // Find the top-level block
  for (const block of context.value) {
    if (block._key !== blockKey) {
      continue
    }

    // Navigate to the target text block/cell through the path
    const result = findSpanOffsetInBlock({
      context,
      block,
      selectionPoint,
      pathIndex: 0,
    })

    if (result) {
      return result
    }
  }

  return undefined
}

/**
 * Recursively finds the span offset within a block, navigating through nested containers
 */
function findSpanOffsetInBlock({
  context,
  block,
  selectionPoint,
  pathIndex,
}: {
  context: Pick<EditorContext, 'schema' | 'value'>
  block: any
  selectionPoint: EditorSelectionPoint
  pathIndex: number
}): BlockOffset | undefined {
  // Build the current block path up to this point
  const blockPath = selectionPoint.path.slice(0, pathIndex + 1)

  // Check if this is a container block
  if (isContainerBlock(context, block)) {
    const firstChild = block.children[0]
    const hasSpanChildren =
      firstChild &&
      (isSpan(context, firstChild) ||
        (typeof firstChild === 'object' &&
          '_type' in firstChild &&
          !isContainerBlock(context, firstChild) &&
          !isTextBlock(context, firstChild)))

    if (!hasSpanChildren) {
      // This container has block children, need to navigate deeper
      const nextKeyIndex = pathIndex + 2
      if (nextKeyIndex >= selectionPoint.path.length) {
        return undefined
      }

      const nextKeySegment = selectionPoint.path[nextKeyIndex]
      if (typeof nextKeySegment !== 'object' || !('_key' in nextKeySegment)) {
        return undefined
      }

      // Find the child block we need to navigate to
      const childBlock = block.children.find(
        (child: any) => child._key === nextKeySegment._key,
      )

      if (!childBlock) {
        return undefined
      }

      return findSpanOffsetInBlock({
        context,
        block: childBlock,
        selectionPoint,
        pathIndex: nextKeyIndex,
      })
    }
    // If hasSpanChildren, fall through to process spans below
  }

  // At this point, we should be at a text block or container with span children
  if (!isTextBlock(context, block) && !isContainerBlock(context, block)) {
    return undefined
  }

  // Get the span key from the selection point (it should be right after the current path)
  const spanKeyIndex = pathIndex + 2
  if (spanKeyIndex >= selectionPoint.path.length) {
    return undefined
  }

  const spanKeySegment = selectionPoint.path[spanKeyIndex]
  if (typeof spanKeySegment !== 'object' || !('_key' in spanKeySegment)) {
    return undefined
  }

  const spanKey = spanKeySegment._key

  // Calculate the offset by summing up span text lengths until we find the target span
  let offset = 0
  for (const child of block.children) {
    if (!isSpan(context, child)) {
      continue
    }

    if (child._key === spanKey) {
      return {
        path: blockPath,
        offset: offset + selectionPoint.offset,
      }
    }

    offset += child.text.length
  }

  return undefined
}
