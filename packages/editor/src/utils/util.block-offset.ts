import {isSpan, isTextBlock} from '@portabletext/schema'
import {getNode} from '../traversal/get-node'
import {getParent} from '../traversal/get-parent'
import type {TraversalSnapshot} from '../traversal/traversal-snapshot'
import type {BlockOffset} from '../types/block-offset'
import type {EditorSelectionPoint} from '../types/editor'
import type {ChildPath} from '../types/paths'
import {childAtTextOffset, textOffsetOfChild} from './util.child-text-offset'
import {isKeyedSegment} from './util.is-keyed-segment'

/**
 * @public
 */
export function blockOffsetToSpanSelectionPoint({
  snapshot,
  blockOffset,
  direction,
}: {
  snapshot: TraversalSnapshot
  blockOffset: BlockOffset
  direction: 'forward' | 'backward'
}) {
  const blockEntry = getNode(snapshot, blockOffset.path)

  if (!blockEntry || !isTextBlock(snapshot.context, blockEntry.node)) {
    return undefined
  }

  const block = blockEntry.node
  const blockPath = blockEntry.path

  if (direction === 'forward') {
    const placed = childAtTextOffset(
      block.children,
      (child) =>
        isSpan(snapshot.context, child as (typeof block.children)[number])
          ? (child as {text: string}).text
          : undefined,
      blockOffset.offset,
    )
    return placed
      ? {
          path: [
            ...blockPath,
            'children',
            {_key: placed.key},
          ] satisfies ChildPath,
          offset: placed.offset,
        }
      : undefined
  }

  let offsetLeft = blockOffset.offset
  let selectionPoint: {path: ChildPath; offset: number} | undefined
  let skippedInlineObject = false

  for (const child of block.children) {
    if (!isSpan(snapshot.context, child)) {
      skippedInlineObject = true
      continue
    }

    if (offsetLeft === 0 && selectionPoint && !skippedInlineObject) {
      // A boundary offset stays at the end of the previous span unless an
      // inline object was skipped, in which case falling through to the
      // `offsetLeft <= child.text.length` branch lands the point at the
      // start of this span instead.
      break
    }

    if (offsetLeft > child.text.length) {
      offsetLeft -= child.text.length
      continue
    }

    if (offsetLeft <= child.text.length) {
      selectionPoint = {
        path: [...blockPath, 'children', {_key: child._key}],
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
 * @public
 */
export function spanSelectionPointToBlockOffset({
  snapshot,
  selectionPoint,
}: {
  snapshot: TraversalSnapshot
  selectionPoint: EditorSelectionPoint
}): BlockOffset | undefined {
  const spanSegment = selectionPoint.path.at(-1)

  if (!isKeyedSegment(spanSegment)) {
    return undefined
  }

  const textBlock = getParent(snapshot, selectionPoint.path, {
    match: (node) => isTextBlock({schema: snapshot.context.schema}, node),
  })

  if (!textBlock) {
    return undefined
  }

  const offset = textOffsetOfChild(
    textBlock.node.children,
    (child) =>
      isSpan(
        snapshot.context,
        child as (typeof textBlock.node.children)[number],
      )
        ? (child as {text: string}).text
        : undefined,
    spanSegment._key,
    selectionPoint.offset,
  )

  return offset === undefined ? undefined : {path: textBlock.path, offset}
}
