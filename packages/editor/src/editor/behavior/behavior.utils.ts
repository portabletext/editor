import {
  isKeySegment,
  isPortableTextTextBlock,
  type KeyedSegment,
  type PortableTextBlock,
  type PortableTextObject,
} from '@sanity/types'
import type {BehaviorContext} from './behavior.types'

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

export function getFocusBlockObject(
  context: BehaviorContext,
): {node: PortableTextObject; path: [KeyedSegment]} | undefined {
  const focusBlock = getFocusBlock(context)

  return focusBlock && !isPortableTextTextBlock(focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}
