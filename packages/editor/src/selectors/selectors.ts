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
import {createGuards} from '../behavior-actions/behavior.guards'
import type {EditorSelector} from '../editor/editor-selector'

/**
 * @public
 */
export const getFocusBlock: EditorSelector<
  {node: PortableTextBlock; path: [KeyedSegment]} | undefined
> = (snapshot) => {
  const key = snapshot.context.selection
    ? isKeySegment(snapshot.context.selection.focus.path[0])
      ? snapshot.context.selection.focus.path[0]._key
      : undefined
    : undefined

  const node = key
    ? snapshot.context.value.find((block) => block._key === key)
    : undefined

  return node && key ? {node, path: [{_key: key}]} : undefined
}

/**
 * @public
 */
export const getFocusListBlock: EditorSelector<
  {node: PortableTextListBlock; path: [KeyedSegment]} | undefined
> = (snapshot) => {
  const guards = createGuards(snapshot.context)
  const focusBlock = getFocusBlock(snapshot)

  return focusBlock && guards.isListBlock(focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}

/**
 * @public
 */
export const getFocusTextBlock: EditorSelector<
  {node: PortableTextTextBlock; path: [KeyedSegment]} | undefined
> = (snapshot) => {
  const focusBlock = getFocusBlock(snapshot)

  return focusBlock && isPortableTextTextBlock(focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}

/**
 * @public
 */
export const getFocusBlockObject: EditorSelector<
  {node: PortableTextObject; path: [KeyedSegment]} | undefined
> = (snapshot) => {
  const focusBlock = getFocusBlock(snapshot)

  return focusBlock && !isPortableTextTextBlock(focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}

/**
 * @public
 */
export const getFocusChild: EditorSelector<
  | {
      node: PortableTextObject | PortableTextSpan
      path: [KeyedSegment, 'children', KeyedSegment]
    }
  | undefined
> = (snapshot) => {
  const focusBlock = getFocusTextBlock(snapshot)

  if (!focusBlock) {
    return undefined
  }

  const key = snapshot.context.selection
    ? isKeySegment(snapshot.context.selection.focus.path[2])
      ? snapshot.context.selection.focus.path[2]._key
      : undefined
    : undefined

  const node = key
    ? focusBlock.node.children.find((span) => span._key === key)
    : undefined

  return node && key
    ? {node, path: [...focusBlock.path, 'children', {_key: key}]}
    : undefined
}

/**
 * @public
 */
export const getFocusSpan: EditorSelector<
  | {node: PortableTextSpan; path: [KeyedSegment, 'children', KeyedSegment]}
  | undefined
> = (snapshot) => {
  const focusChild = getFocusChild(snapshot)

  return focusChild && isPortableTextSpan(focusChild.node)
    ? {node: focusChild.node, path: focusChild.path}
    : undefined
}

/**
 * @public
 */
export const getFirstBlock: EditorSelector<
  {node: PortableTextBlock; path: [KeyedSegment]} | undefined
> = (snapshot) => {
  const node = snapshot.context.value[0]

  return node ? {node, path: [{_key: node._key}]} : undefined
}

/**
 * @public
 */
export const getLastBlock: EditorSelector<
  {node: PortableTextBlock; path: [KeyedSegment]} | undefined
> = (snapshot) => {
  const node = snapshot.context.value[snapshot.context.value.length - 1]
    ? snapshot.context.value[snapshot.context.value.length - 1]
    : undefined

  return node ? {node, path: [{_key: node._key}]} : undefined
}

/**
 * @public
 */
export const getSelectedBlocks: EditorSelector<
  Array<{node: PortableTextBlock; path: [KeyedSegment]}>
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return []
  }

  const selectedBlocks: Array<{node: PortableTextBlock; path: [KeyedSegment]}> =
    []
  const startKey = snapshot.context.selection.backward
    ? isKeySegment(snapshot.context.selection.focus.path[0])
      ? snapshot.context.selection.focus.path[0]._key
      : undefined
    : isKeySegment(snapshot.context.selection.anchor.path[0])
      ? snapshot.context.selection.anchor.path[0]._key
      : undefined
  const endKey = snapshot.context.selection.backward
    ? isKeySegment(snapshot.context.selection.anchor.path[0])
      ? snapshot.context.selection.anchor.path[0]._key
      : undefined
    : isKeySegment(snapshot.context.selection.focus.path[0])
      ? snapshot.context.selection.focus.path[0]._key
      : undefined

  if (!startKey || !endKey) {
    return selectedBlocks
  }

  for (const block of snapshot.context.value) {
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

/**
 * @public
 */
export const getSelectionStartBlock: EditorSelector<
  | {
      node: PortableTextBlock
      path: [KeyedSegment]
    }
  | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const key = snapshot.context.selection.backward
    ? isKeySegment(snapshot.context.selection.focus.path[0])
      ? snapshot.context.selection.focus.path[0]._key
      : undefined
    : isKeySegment(snapshot.context.selection.anchor.path[0])
      ? snapshot.context.selection.anchor.path[0]._key
      : undefined

  const node = key
    ? snapshot.context.value.find((block) => block._key === key)
    : undefined

  return node && key ? {node, path: [{_key: key}]} : undefined
}

/**
 * @public
 */
export const getSelectionEndBlock: EditorSelector<
  | {
      node: PortableTextBlock
      path: [KeyedSegment]
    }
  | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const key = snapshot.context.selection.backward
    ? isKeySegment(snapshot.context.selection.anchor.path[0])
      ? snapshot.context.selection.anchor.path[0]._key
      : undefined
    : isKeySegment(snapshot.context.selection.focus.path[0])
      ? snapshot.context.selection.focus.path[0]._key
      : undefined

  const node = key
    ? snapshot.context.value.find((block) => block._key === key)
    : undefined

  return node && key ? {node, path: [{_key: key}]} : undefined
}

/**
 * @public
 */
export const getPreviousBlock: EditorSelector<
  {node: PortableTextBlock; path: [KeyedSegment]} | undefined
> = (snapshot) => {
  let previousBlock: {node: PortableTextBlock; path: [KeyedSegment]} | undefined
  const selectionStartBlock = getSelectionStartBlock(snapshot)

  if (!selectionStartBlock) {
    return undefined
  }

  let foundSelectionStartBlock = false

  for (const block of snapshot.context.value) {
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

/**
 * @public
 */
export const getNextBlock: EditorSelector<
  {node: PortableTextBlock; path: [KeyedSegment]} | undefined
> = (snapshot) => {
  let nextBlock: {node: PortableTextBlock; path: [KeyedSegment]} | undefined
  const selectionEndBlock = getSelectionEndBlock(snapshot)

  if (!selectionEndBlock) {
    return undefined
  }

  let foundSelectionEndBlock = false

  for (const block of snapshot.context.value) {
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
