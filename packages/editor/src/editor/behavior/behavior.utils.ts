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

export function getSelectionStartBlock(context: BehaviorContext):
  | {
      node: PortableTextBlock
      path: [KeyedSegment]
    }
  | undefined {
  const key = context.selection.backward
    ? isKeySegment(context.selection.focus.path[0])
      ? context.selection.focus.path[0]._key
      : undefined
    : isKeySegment(context.selection.anchor.path[0])
      ? context.selection.anchor.path[0]._key
      : undefined

  const node = key
    ? context.value.find((block) => block._key === key)
    : undefined

  return node && key ? {node, path: [{_key: key}]} : undefined
}

export function getSelectionEndBlock(context: BehaviorContext):
  | {
      node: PortableTextBlock
      path: [KeyedSegment]
    }
  | undefined {
  const key = context.selection.backward
    ? isKeySegment(context.selection.anchor.path[0])
      ? context.selection.anchor.path[0]._key
      : undefined
    : isKeySegment(context.selection.focus.path[0])
      ? context.selection.focus.path[0]._key
      : undefined

  const node = key
    ? context.value.find((block) => block._key === key)
    : undefined

  return node && key ? {node, path: [{_key: key}]} : undefined
}

export function getPreviousBlock(
  context: BehaviorContext,
): {node: PortableTextBlock; path: [KeyedSegment]} | undefined {
  let previousBlock: {node: PortableTextBlock; path: [KeyedSegment]} | undefined
  const selectionStartBlock = getSelectionStartBlock(context)

  if (!selectionStartBlock) {
    return undefined
  }

  let foundSelectionStartBlock = false

  for (const block of context.value) {
    if (block._key === selectionStartBlock.node._key) {
      foundSelectionStartBlock = true
      break
    }

    previousBlock = {node: block, path: [{_key: block._key}]}
  }

  if (foundSelectionStartBlock && previousBlock) {
    return previousBlock
  }

  return undefined
}

export function getNextBlock(
  context: BehaviorContext,
): {node: PortableTextBlock; path: [KeyedSegment]} | undefined {
  let nextBlock: {node: PortableTextBlock; path: [KeyedSegment]} | undefined
  const selectionEndBlock = getSelectionEndBlock(context)

  if (!selectionEndBlock) {
    return undefined
  }

  let foundSelectionEndBlock = false

  for (const block of context.value) {
    if (block._key === selectionEndBlock.node._key) {
      foundSelectionEndBlock = true
      continue
    }

    if (foundSelectionEndBlock) {
      nextBlock = {node: block, path: [{_key: block._key}]}
      break
    }
  }

  if (foundSelectionEndBlock && nextBlock) {
    return nextBlock
  }

  return undefined
}

export function isEmptyTextBlock(block: PortableTextTextBlock) {
  return block.children.length === 1 && block.children[0].text === ''
}
