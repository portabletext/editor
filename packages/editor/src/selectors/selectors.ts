import type {
  PortableTextBlock,
  PortableTextListBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@sanity/types'
import type {EditorSelector} from '../editor/editor-selector'
import {isListBlock, isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {isBackward} from '../types/selection'

/**
 * @public
 */
export const getFocusBlock: EditorSelector<
  {node: PortableTextBlock; path: [number]} | undefined
> = (snapshot) => {
  const blockIndex = snapshot.context.selection
    ? snapshot.context.selection.focus.path[0]
    : undefined

  const node =
    blockIndex !== undefined ? snapshot.context.value.at(blockIndex) : undefined

  if (node && blockIndex !== undefined) {
    return {node, path: [blockIndex]}
  }

  return undefined
}

/**
 * @public
 */
export const getFocusListBlock: EditorSelector<
  {node: PortableTextListBlock; path: [number]} | undefined
> = (snapshot) => {
  const focusTextBlock = getFocusTextBlock(snapshot)

  return focusTextBlock && isListBlock(snapshot.context, focusTextBlock.node)
    ? {node: focusTextBlock.node, path: focusTextBlock.path}
    : undefined
}

/**
 * @public
 */
export const getFocusTextBlock: EditorSelector<
  {node: PortableTextTextBlock; path: [number]} | undefined
> = (snapshot) => {
  const focusBlock = getFocusBlock(snapshot)

  return focusBlock && isTextBlock(snapshot.context, focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}

/**
 * @public
 */
export const getFocusBlockObject: EditorSelector<
  {node: PortableTextObject; path: [number]} | undefined
> = (snapshot) => {
  const focusBlock = getFocusBlock(snapshot)

  return focusBlock && !isTextBlock(snapshot.context, focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}

/**
 * @public
 */
export const getFocusChild: EditorSelector<
  | {
      node: PortableTextObject | PortableTextSpan
      path: [number, number]
    }
  | undefined
> = (snapshot) => {
  const focusBlock = getFocusTextBlock(snapshot)

  if (!focusBlock) {
    return undefined
  }

  const childIndex = snapshot.context.selection
    ? snapshot.context.selection.focus.path[1] !== undefined
      ? snapshot.context.selection.focus.path[1]
      : undefined
    : undefined

  const node =
    childIndex !== undefined
      ? focusBlock.node.children.at(childIndex)
      : undefined

  if (node && childIndex !== undefined) {
    return {node, path: [...focusBlock.path, childIndex]}
  }

  return undefined
}

/**
 * @public
 */
export const getFocusSpan: EditorSelector<
  {node: PortableTextSpan; path: [number, number]} | undefined
> = (snapshot) => {
  const focusChild = getFocusChild(snapshot)

  return focusChild && isSpan(snapshot.context, focusChild.node)
    ? {node: focusChild.node, path: focusChild.path}
    : undefined
}

/**
 * @public
 */
export const getFirstBlock: EditorSelector<
  {node: PortableTextBlock; path: [number]} | undefined
> = (snapshot) => {
  const node = snapshot.context.value[0]

  return node ? {node, path: [0]} : undefined
}

/**
 * @public
 */
export const getLastBlock: EditorSelector<
  {node: PortableTextBlock; path: [number]} | undefined
> = (snapshot) => {
  const node = snapshot.context.value[snapshot.context.value.length - 1]

  return node ? {node, path: [snapshot.context.value.length - 1]} : undefined
}

/**
 * @public
 */
export const getSelectedBlocks: EditorSelector<
  Array<{node: PortableTextBlock; path: [number]}>
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return []
  }

  const selectedBlocks: Array<{node: PortableTextBlock; path: [number]}> = []
  const startKey = isBackward(snapshot.context.selection)
    ? snapshot.context.selection.focus.path[0] !== undefined
      ? snapshot.context.value.at(snapshot.context.selection.focus.path[0])
          ?._key
      : undefined
    : snapshot.context.selection.anchor.path[0] !== undefined
      ? snapshot.context.value.at(snapshot.context.selection.anchor.path[0])
          ?._key
      : undefined
  const endKey = isBackward(snapshot.context.selection)
    ? snapshot.context.selection.anchor.path[0] !== undefined
      ? snapshot.context.value.at(snapshot.context.selection.anchor.path[0])
          ?._key
      : undefined
    : snapshot.context.selection.focus.path[0] !== undefined
      ? snapshot.context.value.at(snapshot.context.selection.focus.path[0])
          ?._key
      : undefined

  if (!startKey || !endKey) {
    return selectedBlocks
  }

  let index = -1

  for (const block of snapshot.context.value) {
    index++

    if (block._key === startKey) {
      selectedBlocks.push({node: block, path: [index]})

      if (startKey === endKey) {
        break
      }
      continue
    }

    if (block._key === endKey) {
      selectedBlocks.push({node: block, path: [index]})
      break
    }

    if (selectedBlocks.length > 0) {
      selectedBlocks.push({node: block, path: [index]})
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
      path: [number]
    }
  | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const startPoint = isBackward(snapshot.context.selection)
    ? snapshot.context.selection.focus
    : snapshot.context.selection.anchor

  const block = startPoint
    ? snapshot.context.value.at(startPoint.path[0])
    : undefined

  return block ? {node: block, path: [startPoint.path[0]]} : undefined
}

/**
 * @public
 */
export const getSelectionEndBlock: EditorSelector<
  | {
      node: PortableTextBlock
      path: [number]
    }
  | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const endPoint = isBackward(snapshot.context.selection)
    ? snapshot.context.selection.anchor
    : snapshot.context.selection.focus

  const block = endPoint
    ? snapshot.context.value.at(endPoint.path[0])
    : undefined

  return block ? {node: block, path: [endPoint.path[0]]} : undefined
}

/**
 * @public
 */
export const getPreviousBlock: EditorSelector<
  {node: PortableTextBlock; path: [number]} | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const startPoint = isBackward(snapshot.context.selection)
    ? snapshot.context.selection.focus
    : snapshot.context.selection.anchor

  const previousBlock = snapshot.context.value.at(startPoint.path[0] - 1)

  if (previousBlock) {
    return {node: previousBlock, path: [startPoint.path[0] - 1]}
  }

  return undefined
}

/**
 * @public
 */
export const getNextBlock: EditorSelector<
  {node: PortableTextBlock; path: [number]} | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const endPoint = isBackward(snapshot.context.selection)
    ? snapshot.context.selection.anchor
    : snapshot.context.selection.focus

  const nextBlock = snapshot.context.value.at(endPoint.path[0] + 1)

  if (nextBlock) {
    return {node: nextBlock, path: [endPoint.path[0] + 1]}
  }

  return undefined
}
