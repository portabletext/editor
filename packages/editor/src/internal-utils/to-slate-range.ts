import {isContainerBlock, isSpan, isTextBlock} from '@portabletext/schema'
import type {PortableTextObject, PortableTextSpan} from '@sanity/types'
import type {Path, Range} from 'slate'
import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import type {EditorSelectionPoint} from '../types/editor'
import {blockOffsetToSpanSelectionPoint} from '../utils/util.block-offset'
import {isEqualSelectionPoints} from '../utils/util.is-equal-selection-points'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'
import {getChildKeyFromSelectionPoint} from '../utils/util.selection-point'
import {getBlockByPath} from './block-path-utils'

export function toSlateRange(
  snapshot: {
    context: Pick<EditorContext, 'schema' | 'value' | 'selection'>
  } & Pick<EditorSnapshot, 'blockIndexMap'>,
): Range | null {
  if (!snapshot.context.selection) {
    return null
  }

  if (
    isEqualSelectionPoints(
      snapshot.context.selection.anchor,
      snapshot.context.selection.focus,
    )
  ) {
    const anchorPoint = toSlateSelectionPoint(
      snapshot,
      snapshot.context.selection.anchor,
      snapshot.context.selection.backward ? 'backward' : 'forward',
    )

    if (!anchorPoint) {
      return null
    }

    return {
      anchor: anchorPoint,
      focus: anchorPoint,
    }
  }

  const anchorPoint = toSlateSelectionPoint(
    snapshot,
    snapshot.context.selection.anchor,
    snapshot.context.selection.backward ? 'forward' : 'backward',
  )
  const focusPoint = toSlateSelectionPoint(
    snapshot,
    snapshot.context.selection.focus,
    snapshot.context.selection.backward ? 'backward' : 'forward',
  )

  if (!anchorPoint || !focusPoint) {
    return null
  }

  return {
    anchor: anchorPoint,
    focus: focusPoint,
  }
}

function toSlateSelectionPoint(
  snapshot: {
    context: Pick<EditorContext, 'schema' | 'value'>
  } & Pick<EditorSnapshot, 'blockIndexMap'>,
  selectionPoint: EditorSelectionPoint,
  direction: 'forward' | 'backward',
):
  | {
      path: Path
      offset: number
    }
  | undefined {
  // For nested container blocks (e.g., table > row > cell),
  // we need to find the deepest block in the selection path that exists in blockIndexMap
  // The path structure is: [{_key: table}, 'children', {_key: row}, 'children', {_key: cell}, 'children', {_key: span}]
  // We want to find the deepest block (cell in this case) that's in the blockIndexMap

  let blockKey: string | undefined
  let blockPath: Array<number> | undefined
  let blockKeyIndex = -1

  // Traverse the selection path and find the deepest block
  for (let i = 0; i < selectionPoint.path.length; i++) {
    const segment = selectionPoint.path[i]
    if (isKeyedSegment(segment)) {
      const candidatePath = snapshot.blockIndexMap.get(segment._key)
      if (candidatePath !== undefined) {
        blockKey = segment._key
        blockPath = candidatePath
        blockKeyIndex = i
      }
    }
  }

  if (!blockKey || blockPath === undefined || blockKeyIndex === -1) {
    return undefined
  }

  // Create a relative selection point from the block onwards
  // If the path is [{table}, 'children', {row}, 'children', {cell}, 'children', {span}]
  // and we found {cell} at index 4, we want [{cell}, 'children', {span}]
  const relativeSelectionPoint: EditorSelectionPoint = {
    path: selectionPoint.path.slice(blockKeyIndex),
    offset: selectionPoint.offset,
  }

  // Get the actual block at the given path (may be nested in containers)
  const block = getBlockByPath(snapshot.context, blockPath)

  if (!block) {
    return undefined
  }

  // For container blocks (nested blocks like table > row > cell), check if we have a partial path
  // If the selection path ends at a container block (e.g., just the row), return its position
  // If it continues deeper, find the child span within that block
  if (!isTextBlock(snapshot.context, block)) {
    // Check if the relative path has more segments after the current block
    // relativeSelectionPoint.path starts with the current block key
    // If it only has 1 element [{_key: blockKey}], this is a partial path pointing to the block itself
    if (
      relativeSelectionPoint.path.length === 1 &&
      selectionPoint.offset === 0
    ) {
      // Partial path with offset 0 - need to determine how to handle it
      // Check what type of children this block has
      const hasChildren =
        block.children &&
        Array.isArray(block.children) &&
        block.children.length > 0

      if (!hasChildren) {
        // Block object without children needs a synthetic leaf
        return {
          path: [...blockPath, 0],
          offset: 0,
        }
      }

      // Check if the first child is a container block (nested structure)
      // vs a span/inline object (text content)
      const firstChild = Array.isArray(block.children)
        ? block.children[0]
        : undefined
      const hasBlockChildren =
        firstChild && isContainerBlock(snapshot.context, firstChild)

      if (hasBlockChildren) {
        // Container has block children (like table > row > cell), return the block's position
        return {
          path: blockPath,
          offset: 0,
        }
      }

      // Container has span/inline children (like cell with spans)
      // Fall through to blockOffsetToSpanSelectionPoint to resolve to the first span
    }

    let childKey = getChildKeyFromSelectionPoint({
      path: relativeSelectionPoint.path,
      offset: 0,
    })

    // If there's no child key, try to use block offset to find the span
    const blockOffsetPath = selectionPoint.path.slice(0, blockKeyIndex + 1)
    const spanSelectionPoint = !childKey
      ? blockOffsetToSpanSelectionPoint({
          context: {
            schema: snapshot.context.schema,
            value: snapshot.context.value,
          },
          blockOffset: {
            path: blockOffsetPath,
            offset: selectionPoint.offset,
          },
          direction,
        })
      : undefined

    // For nested paths, we need to find the LAST keyed segment (the span),
    // not just the one at index 2 (which might be a container like row)
    if (spanSelectionPoint) {
      for (let i = spanSelectionPoint.path.length - 1; i >= 0; i--) {
        const segment = spanSelectionPoint.path[i]
        if (isKeyedSegment(segment)) {
          childKey = segment._key
          break
        }
      }
    }

    if (!childKey || !block.children || !Array.isArray(block.children)) {
      // No child specified or block has no children, select first leaf
      return {
        path: [...blockPath, 0],
        offset: 0,
      }
    }

    // Find the child in the block's children
    let offset = spanSelectionPoint?.offset ?? relativeSelectionPoint.offset
    let childPath: Array<number> = []
    let childIndex = -1
    let pathChild: PortableTextSpan | PortableTextObject | undefined

    for (const child of block.children) {
      childIndex++
      if (child._key === childKey) {
        pathChild = child
        if (isSpan(snapshot.context, child)) {
          childPath = [childIndex]
        } else {
          childPath = [childIndex, 0]
          offset = 0
        }
        break
      }
    }

    if (childPath.length === 0) {
      // Child not found, select first leaf
      return {
        path: [...blockPath, 0],
        offset: 0,
      }
    }

    return {
      path: [...blockPath].concat(childPath),
      offset: isSpan(snapshot.context, pathChild)
        ? Math.min(pathChild.text.length, offset)
        : offset,
    }
  }

  let childKey = getChildKeyFromSelectionPoint({
    path: relativeSelectionPoint.path,
    offset: 0,
  })

  // If the block is a text block, but there is no child key in the selection
  // point path, then we can try to find a span selection point by the offset.
  // Use the original selectionPoint path up to (and including) the current block
  const blockOffsetPath = selectionPoint.path.slice(0, blockKeyIndex + 1)
  const spanSelectionPoint = !childKey
    ? blockOffsetToSpanSelectionPoint({
        context: {
          schema: snapshot.context.schema,
          value: snapshot.context.value,
        },
        blockOffset: {
          path: blockOffsetPath,
          offset: selectionPoint.offset,
        },
        direction,
      })
    : undefined

  // For nested paths, we need to find the LAST keyed segment (the span),
  // not just the one at index 2 (which might be a container like row)
  if (spanSelectionPoint) {
    for (let i = spanSelectionPoint.path.length - 1; i >= 0; i--) {
      const segment = spanSelectionPoint.path[i]
      if (isKeyedSegment(segment)) {
        childKey = segment._key
        break
      }
    }
  }

  // If we still don't have a child key, then we have to resort to selecting
  // the first child of the block (which by Slate convention is a span).
  if (!childKey) {
    return {
      path: [...blockPath, 0],
      offset: 0,
    }
  }

  let offset = spanSelectionPoint?.offset ?? relativeSelectionPoint.offset
  let childPath: Array<number> = []
  let childIndex = -1
  let pathChild: PortableTextSpan | PortableTextObject | undefined

  for (const child of block.children) {
    childIndex++
    if (child._key === childKey) {
      pathChild = child
      if (isSpan(snapshot.context, child)) {
        childPath = [childIndex]
      } else {
        childPath = [childIndex, 0]
        offset = 0
      }
      break
    }
  }

  // If we for some unforeseen reason didn't manage to produce a child path,
  // then we have to resort to selecting the first child of the block (which
  // by Slate convention is a span).
  if (childPath.length === 0) {
    return {
      path: [...blockPath, 0],
      offset: 0,
    }
  }

  return {
    path: [...blockPath].concat(childPath),
    offset: isSpan(snapshot.context, pathChild)
      ? Math.min(pathChild.text.length, offset)
      : offset,
  }
}
