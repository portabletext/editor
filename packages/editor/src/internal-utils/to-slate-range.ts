import type {PortableTextObject, PortableTextSpan} from '@sanity/types'
import type {Path, Range} from 'slate'
import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../selection/selection-point'
import type {EditorSelectionPoint} from '../types/editor'
import {isEqualSelectionPoints} from '../utils'
import {blockOffsetToSpanSelectionPoint} from '../utils/util.block-offset'
import {isSpan, isTextBlock} from './parse-blocks'

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
      snapshot.context.selection.backward ? 'forward' : 'backward',
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
  const blockKey = getBlockKeyFromSelectionPoint(selectionPoint)

  if (!blockKey) {
    return undefined
  }

  const blockIndex = snapshot.blockIndexMap.get(blockKey)

  if (blockIndex === undefined) {
    return undefined
  }

  const block = snapshot.context.value.at(blockIndex)

  if (!block) {
    return undefined
  }

  if (!isTextBlock(snapshot.context, block)) {
    return {
      path: [blockIndex, 0],
      offset: 0,
    }
  }

  let childKey = getChildKeyFromSelectionPoint({
    path: selectionPoint.path,
    offset: 0,
  })

  // If the block is a text block, but there is no child key in the selection
  // point path, then we can try to find a span selection point by the offset.
  const spanSelectionPoint = !childKey
    ? blockOffsetToSpanSelectionPoint({
        context: {
          schema: snapshot.context.schema,
          value: [block],
        },
        blockOffset: {
          path: [{_key: blockKey}],
          offset: selectionPoint.offset,
        },
        direction,
      })
    : undefined

  childKey = spanSelectionPoint
    ? getChildKeyFromSelectionPoint(spanSelectionPoint)
    : childKey

  // If we still don't have a child key, then we have to resort to selecting
  // the first child of the block (which by Slate convention is a span).
  if (!childKey) {
    return {
      path: [blockIndex, 0],
      offset: 0,
    }
  }

  let offset = spanSelectionPoint?.offset ?? selectionPoint.offset
  let childPath: Array<number> = []
  let childIndex = -1
  let pathChild: PortableTextSpan | PortableTextObject | undefined = undefined

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
      path: [blockIndex, 0],
      offset: 0,
    }
  }

  return {
    path: [blockIndex].concat(childPath),
    offset: isSpan(snapshot.context, pathChild)
      ? Math.min(pathChild.text.length, offset)
      : offset,
  }
}
