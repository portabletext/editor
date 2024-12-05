import {
  isKeySegment,
  isPortableTextSpan,
  isPortableTextTextBlock,
  type KeyedSegment,
  type PortableTextBlock,
  type PortableTextListBlock,
  type PortableTextObject,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@sanity/types'
import {createGuards} from './behavior.guards'
import type {EditorContext, EditorState} from './behavior.types'

/**
 * Selection utilities
 */

export function selectionIsCollapsed(state: EditorState) {
  return (
    JSON.stringify(state.selection?.anchor.path) ===
      JSON.stringify(state.selection?.focus.path) &&
    state.selection?.anchor.offset === state.selection?.focus.offset
  )
}

/**
 * Value utilities
 */

export function getFocusBlock(
  state: EditorState,
): {node: PortableTextBlock; path: [KeyedSegment]} | undefined {
  const key = state.selection
    ? isKeySegment(state.selection.focus.path[0])
      ? state.selection.focus.path[0]._key
      : undefined
    : undefined

  const node = key ? state.value.find((block) => block._key === key) : undefined

  return node && key ? {node, path: [{_key: key}]} : undefined
}

export function getFocusTextBlock(
  state: EditorState,
): {node: PortableTextTextBlock; path: [KeyedSegment]} | undefined {
  const focusBlock = getFocusBlock(state)

  return focusBlock && isPortableTextTextBlock(focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}

export function getFocusListBlock({
  context,
  state,
}: {
  context: EditorContext
  state: EditorState
}): {node: PortableTextListBlock; path: [KeyedSegment]} | undefined {
  const guards = createGuards(context)
  const focusBlock = getFocusBlock(state)

  return focusBlock && guards.isListBlock(focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}

export function getFocusBlockObject(
  state: EditorState,
): {node: PortableTextObject; path: [KeyedSegment]} | undefined {
  const focusBlock = getFocusBlock(state)

  return focusBlock && !isPortableTextTextBlock(focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}

export function getFocusChild(state: EditorState):
  | {
      node: PortableTextObject | PortableTextSpan
      path: [KeyedSegment, 'children', KeyedSegment]
    }
  | undefined {
  const focusBlock = getFocusTextBlock(state)

  if (!focusBlock) {
    return undefined
  }

  const key = state.selection
    ? isKeySegment(state.selection.focus.path[2])
      ? state.selection.focus.path[2]._key
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
  state: EditorState,
):
  | {node: PortableTextSpan; path: [KeyedSegment, 'children', KeyedSegment]}
  | undefined {
  const focusChild = getFocusChild(state)

  return focusChild && isPortableTextSpan(focusChild.node)
    ? {node: focusChild.node, path: focusChild.path}
    : undefined
}

export function getFirstBlock(
  state: EditorState,
): {node: PortableTextBlock; path: [KeyedSegment]} | undefined {
  const node = state.value[0]

  return node ? {node, path: [{_key: node._key}]} : undefined
}

export function getLastBlock(
  state: EditorState,
): {node: PortableTextBlock; path: [KeyedSegment]} | undefined {
  const node = state.value[state.value.length - 1]
    ? state.value[state.value.length - 1]
    : undefined

  return node ? {node, path: [{_key: node._key}]} : undefined
}

export function getSelectedBlocks(
  state: EditorState,
): Array<{node: PortableTextBlock; path: [KeyedSegment]}> {
  const selectedBlocks: Array<{node: PortableTextBlock; path: [KeyedSegment]}> =
    []
  const startKey = state.selection.backward
    ? isKeySegment(state.selection.focus.path[0])
      ? state.selection.focus.path[0]._key
      : undefined
    : isKeySegment(state.selection.anchor.path[0])
      ? state.selection.anchor.path[0]._key
      : undefined
  const endKey = state.selection.backward
    ? isKeySegment(state.selection.anchor.path[0])
      ? state.selection.anchor.path[0]._key
      : undefined
    : isKeySegment(state.selection.focus.path[0])
      ? state.selection.focus.path[0]._key
      : undefined

  if (!startKey || !endKey) {
    return selectedBlocks
  }

  for (const block of state.value) {
    if (block._key === startKey) {
      selectedBlocks.push({node: block, path: [{_key: block._key}]})

      if (startKey === endKey) {
        break
      }
      continue
    }

    if (block._key === endKey) {
      selectedBlocks.push({node: block, path: [{_key: block._key}]})
      break
    }

    if (selectedBlocks.length > 0) {
      selectedBlocks.push({node: block, path: [{_key: block._key}]})
    }
  }

  return selectedBlocks
}

export function getSelectionStartBlock(state: EditorState):
  | {
      node: PortableTextBlock
      path: [KeyedSegment]
    }
  | undefined {
  const key = state.selection.backward
    ? isKeySegment(state.selection.focus.path[0])
      ? state.selection.focus.path[0]._key
      : undefined
    : isKeySegment(state.selection.anchor.path[0])
      ? state.selection.anchor.path[0]._key
      : undefined

  const node = key ? state.value.find((block) => block._key === key) : undefined

  return node && key ? {node, path: [{_key: key}]} : undefined
}

export function getSelectionEndBlock(state: EditorState):
  | {
      node: PortableTextBlock
      path: [KeyedSegment]
    }
  | undefined {
  const key = state.selection.backward
    ? isKeySegment(state.selection.anchor.path[0])
      ? state.selection.anchor.path[0]._key
      : undefined
    : isKeySegment(state.selection.focus.path[0])
      ? state.selection.focus.path[0]._key
      : undefined

  const node = key ? state.value.find((block) => block._key === key) : undefined

  return node && key ? {node, path: [{_key: key}]} : undefined
}

export function getPreviousBlock(
  state: EditorState,
): {node: PortableTextBlock; path: [KeyedSegment]} | undefined {
  let previousBlock: {node: PortableTextBlock; path: [KeyedSegment]} | undefined
  const selectionStartBlock = getSelectionStartBlock(state)

  if (!selectionStartBlock) {
    return undefined
  }

  let foundSelectionStartBlock = false

  for (const block of state.value) {
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
  state: EditorState,
): {node: PortableTextBlock; path: [KeyedSegment]} | undefined {
  let nextBlock: {node: PortableTextBlock; path: [KeyedSegment]} | undefined
  const selectionEndBlock = getSelectionEndBlock(state)

  if (!selectionEndBlock) {
    return undefined
  }

  let foundSelectionEndBlock = false

  for (const block of state.value) {
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

export function isEmptyTextBlock(block: PortableTextBlock) {
  if (!isPortableTextTextBlock(block)) {
    return false
  }

  const onlyText = block.children.every(isPortableTextSpan)
  const blockText = getTextBlockText(block)

  return onlyText && blockText === ''
}

export function getTextBlockText(block: PortableTextTextBlock) {
  return block.children.map((child) => child.text ?? '').join('')
}
