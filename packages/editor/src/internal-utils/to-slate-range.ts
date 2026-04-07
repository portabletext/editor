import {
  isSpan,
  isTextBlock,
  type PortableTextObject,
  type PortableTextSpan,
} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import type {Path} from '../slate/interfaces/path'
import type {Range} from '../slate/interfaces/range'
import type {EditorSelectionPoint} from '../types/editor'
import {blockOffsetToSpanSelectionPoint} from '../utils/util.block-offset'
import {isEqualSelectionPoints} from '../utils/util.is-equal-selection-points'
import {
  getBlockKeyFromSelectionPoint,
  getChildKeyFromSelectionPoint,
} from '../utils/util.selection-point'

export function toSlateRange(snapshot: {
  context: Pick<EditorContext, 'schema' | 'value' | 'selection'>
  [key: string]: unknown
}): Range | null {
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
  },
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

  const block = snapshot.context.value.find((b) => b._key === blockKey)

  if (!block) {
    return undefined
  }

  if (!isTextBlock(snapshot.context, block)) {
    return {
      path: [{_key: blockKey}],
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
    const firstChild = block.children.at(0)
    if (!firstChild) {
      return {
        path: [{_key: blockKey}],
        offset: 0,
      }
    }
    return {
      path: [{_key: blockKey}, 'children', {_key: firstChild._key}],
      offset: 0,
    }
  }

  let offset = spanSelectionPoint?.offset ?? selectionPoint.offset
  let pathChild: PortableTextSpan | PortableTextObject | undefined

  for (const child of block.children) {
    if (child._key === childKey) {
      pathChild = child
      if (!isSpan(snapshot.context, child)) {
        offset = 0
      }
      break
    }
  }

  // If we didn't find the child, select the first child of the block.
  if (!pathChild) {
    const firstChild = block.children.at(0)
    if (!firstChild) {
      return {
        path: [{_key: blockKey}],
        offset: 0,
      }
    }
    return {
      path: [{_key: blockKey}, 'children', {_key: firstChild._key}],
      offset: 0,
    }
  }

  return {
    path: [{_key: blockKey}, 'children', {_key: childKey}],
    offset: isSpan(snapshot.context, pathChild)
      ? Math.min(pathChild.text.length, offset)
      : offset,
  }
}
