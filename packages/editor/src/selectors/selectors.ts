import type {
  PortableTextBlock,
  PortableTextListBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@sanity/types'
import {
  isIndexedSelection,
  isIndexedSelectionPoint,
} from '../editor/editor-selection'
import type {EditorSelector} from '../editor/editor-selector'
import {isListBlock, isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import {
  isIndexedBlockPath,
  type BlockPath,
  type ChildPath,
} from '../types/paths'
import {isKeyedSegment} from '../utils'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'

/**
 * @public
 */
export const getFocusBlock: EditorSelector<
  {node: PortableTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  if (isIndexedSelection(snapshot.context.selection)) {
    const blockIndex = snapshot.context.selection.focus.path.at(0)
    const node =
      blockIndex !== undefined
        ? snapshot.context.value.at(blockIndex)
        : undefined

    return node && blockIndex !== undefined
      ? {node, path: [blockIndex]}
      : undefined
  }

  const key = snapshot.context.selection
    ? isKeyedSegment(snapshot.context.selection.focus.path[0])
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
  {node: PortableTextListBlock; path: BlockPath} | undefined
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
  {node: PortableTextTextBlock; path: BlockPath} | undefined
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
  {node: PortableTextObject; path: BlockPath} | undefined
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
      path: ChildPath
    }
  | undefined
> = (snapshot) => {
  const focusBlock = getFocusTextBlock(snapshot)

  if (!focusBlock) {
    return undefined
  }

  if (
    isIndexedSelection(snapshot.context.selection) &&
    isIndexedBlockPath(focusBlock.path)
  ) {
    const childIndex = snapshot.context.selection.focus.path.at(1)
    const node =
      childIndex !== undefined
        ? focusBlock.node.children.at(childIndex)
        : undefined

    return node && childIndex !== undefined
      ? {node, path: [...focusBlock.path, childIndex]}
      : undefined
  }

  const key = snapshot.context.selection
    ? isKeyedSegment(snapshot.context.selection.focus.path[2])
      ? snapshot.context.selection.focus.path[2]._key
      : undefined
    : undefined

  const node = key
    ? focusBlock.node.children.find((child) => child._key === key)
    : undefined

  return node && key
    ? {node, path: [{_key: focusBlock.node._key}, 'children', {_key: key}]}
    : undefined
}

/**
 * @public
 */
export const getFocusSpan: EditorSelector<
  {node: PortableTextSpan; path: ChildPath} | undefined | undefined
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
  {node: PortableTextBlock} | undefined
> = (snapshot) => {
  const node = snapshot.context.value[0]

  return node ? {node} : undefined
}

/**
 * @public
 */
export const getLastBlock: EditorSelector<
  {node: PortableTextBlock} | undefined
> = (snapshot) => {
  const node = snapshot.context.value[snapshot.context.value.length - 1]
    ? snapshot.context.value[snapshot.context.value.length - 1]
    : undefined

  return node ? {node} : undefined
}

/**
 * @public
 */
export const getSelectedBlocks: EditorSelector<
  Array<{node: PortableTextBlock; path: BlockPath}>
> = (snapshot) => {
  const selectedBlocks: Array<{node: PortableTextBlock; path: BlockPath}> = []
  const startBlock = getSelectionStartBlock(snapshot)
  const endBlock = getSelectionEndBlock(snapshot)

  if (!startBlock || !endBlock) {
    return []
  }

  let blockIndex = -1

  for (const block of snapshot.context.value) {
    blockIndex++

    if (block._key === startBlock.node._key) {
      selectedBlocks.push({
        node: block,
        path: isIndexedSelection(snapshot.context.selection)
          ? [blockIndex]
          : [{_key: block._key}],
      })

      if (startBlock.node._key === endBlock.node._key) {
        break
      }
      continue
    }

    if (block._key === endBlock.node._key) {
      selectedBlocks.push({
        node: block,
        path: isIndexedSelection(snapshot.context.selection)
          ? [blockIndex]
          : [{_key: block._key}],
      })
      break
    }

    if (selectedBlocks.length > 0) {
      selectedBlocks.push({
        node: block,
        path: isIndexedSelection(snapshot.context.selection)
          ? [blockIndex]
          : [{_key: block._key}],
      })
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
      path: BlockPath
    }
  | undefined
> = (snapshot) => {
  const startPoint = getSelectionStartPoint(snapshot.context.selection)

  if (!startPoint) {
    return undefined
  }

  const focusBlock = getFocusBlock({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: startPoint,
        focus: startPoint,
      },
    },
  })

  if (!focusBlock) {
    return undefined
  }

  return focusBlock
}

/**
 * @public
 */
export const getSelectionEndBlock: EditorSelector<
  | {
      node: PortableTextBlock
      path: BlockPath
    }
  | undefined
> = (snapshot) => {
  const endPoint = getSelectionEndPoint(snapshot.context.selection)

  if (!endPoint) {
    return undefined
  }

  const focusBlock = getFocusBlock({
    ...snapshot,
    context: {
      ...snapshot.context,
      selection: {
        anchor: endPoint,
        focus: endPoint,
      },
    },
  })

  return focusBlock
}

/**
 * @public
 */
export const getPreviousBlock: EditorSelector<
  {node: PortableTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  const startPoint = getSelectionStartPoint(snapshot.context.selection)

  if (!startPoint) {
    return undefined
  }

  const startBlockIndex = isIndexedSelectionPoint(startPoint)
    ? startPoint.path.at(0)
    : undefined

  if (startBlockIndex !== undefined) {
    if (startBlockIndex === 0) {
      return undefined
    }

    const previousBlock = snapshot.context.value.at(startBlockIndex - 1)

    return previousBlock
      ? {node: previousBlock, path: [startBlockIndex - 1]}
      : undefined
  }

  const startBlockKey = isKeyedSegment(startPoint.path[0])
    ? startPoint.path[0]._key
    : undefined

  if (!startBlockKey) {
    return undefined
  }

  let previousBlock: PortableTextBlock | undefined

  for (const block of snapshot.context.value) {
    if (block._key === startBlockKey) {
      break
    }

    previousBlock = block
  }

  return previousBlock
    ? {node: previousBlock, path: [{_key: previousBlock._key}]}
    : undefined
}

/**
 * @public
 */
export const getNextBlock: EditorSelector<
  {node: PortableTextBlock; path: BlockPath} | undefined
> = (snapshot) => {
  const endPoint = getSelectionEndPoint(snapshot.context.selection)

  if (!endPoint) {
    return undefined
  }

  const endBlockIndex = isIndexedSelectionPoint(endPoint)
    ? endPoint.path.at(0)
    : undefined

  if (endBlockIndex !== undefined) {
    if (endBlockIndex === snapshot.context.value.length - 1) {
      return undefined
    }

    const nextBlock = snapshot.context.value.at(endBlockIndex + 1)

    return nextBlock ? {node: nextBlock, path: [endBlockIndex + 1]} : undefined
  }

  const endBlockKey = isKeyedSegment(endPoint.path[0])
    ? endPoint.path[0]._key
    : undefined

  if (!endBlockKey) {
    return undefined
  }

  let endBlockFound = false
  let nextBlock: PortableTextBlock | undefined

  for (const block of snapshot.context.value) {
    if (block._key === endBlockKey) {
      endBlockFound = true
      continue
    }

    if (endBlockFound) {
      nextBlock = block
      break
    }
  }

  return nextBlock
    ? {node: nextBlock, path: [{_key: nextBlock._key}]}
    : undefined
}
