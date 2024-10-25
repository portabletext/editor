import {
  isKeySegment,
  isPortableTextSpan,
  isPortableTextTextBlock,
  type KeyedSegment,
  type PortableTextBlock,
  type PortableTextObject,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@sanity/types'
import type {BehaviorContext} from './behavior.types'

/**
 * Selection utilities
 */

export function selectionIsCollapsed(context: BehaviorContext) {
  return (
    context.selection?.anchor.path.join() ===
      context.selection?.focus.path.join() &&
    context.selection?.anchor.offset === context.selection?.focus.offset
  )
}

/**
 * Value utilities
 */

export function getFocusBlock(
  context: BehaviorContext,
): {node: PortableTextBlock; path: [KeyedSegment]} | undefined {
  const key = context.selection
    ? isKeySegment(context.selection.focus.path[0])
      ? context.selection.focus.path[0]._key
      : undefined
    : undefined

  const node = key
    ? context.value.find((block) => block._key === key)
    : undefined

  return node && key ? {node, path: [{_key: key}]} : undefined
}

export function getFocusTextBlock(
  context: BehaviorContext,
): {node: PortableTextTextBlock; path: [KeyedSegment]} | undefined {
  const focusBlock = getFocusBlock(context)

  return focusBlock && isPortableTextTextBlock(focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}

export function getFocusBlockObject(
  context: BehaviorContext,
): {node: PortableTextObject; path: [KeyedSegment]} | undefined {
  const focusBlock = getFocusBlock(context)

  return focusBlock && !isPortableTextTextBlock(focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}

export function getFocusChild(context: BehaviorContext):
  | {
      node: PortableTextObject | PortableTextSpan
      path: [KeyedSegment, 'children', KeyedSegment]
    }
  | undefined {
  const focusBlock = getFocusTextBlock(context)

  if (!focusBlock) {
    return undefined
  }

  const key = context.selection
    ? isKeySegment(context.selection.focus.path[2])
      ? context.selection.focus.path[2]._key
      : undefined
    : undefined

  const node = key
    ? focusBlock.node.children.find((span) => span._key === key)
    : undefined

  return node && key
    ? {node, path: [...focusBlock.path, 'children', {_key: key}]}
    : undefined
}

export function getFocusSpan(
  context: BehaviorContext,
):
  | {node: PortableTextSpan; path: [KeyedSegment, 'children', KeyedSegment]}
  | undefined {
  const focusChild = getFocusChild(context)

  return focusChild && isPortableTextSpan(focusChild.node)
    ? {node: focusChild.node, path: focusChild.path}
    : undefined
}
