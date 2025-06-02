import type {
  PortableTextBlock,
  PortableTextListBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@sanity/types'
import {
  getIndexedSelection,
  getIndexedSelectionPoint,
} from '../editor/editor-selection'
import type {EditorSelector} from '../editor/editor-selector'
import {isListBlock, isSpan, isTextBlock} from '../internal-utils/parse-blocks'
import type {KeyedBlockPath, KeyedChildPath} from '../types/paths'
import {getSelectionEndPoint} from '../utils/util.get-selection-end-point'
import {getSelectionStartPoint} from '../utils/util.get-selection-start-point'

/**
 * @public
 */
export const getFocusBlock: EditorSelector<
  {node: PortableTextBlock; path: KeyedBlockPath; index: number} | undefined
> = (snapshot) => {
  const indexedSelection = getIndexedSelection(
    snapshot.context.schema,
    snapshot.context.value,
    snapshot.context.selection,
  )

  if (!indexedSelection) {
    return undefined
  }

  const blockIndex = indexedSelection.focus.path.at(0)
  const node =
    blockIndex !== undefined ? snapshot.context.value.at(blockIndex) : undefined

  return node && blockIndex !== undefined
    ? {node, path: [{_key: node._key}], index: blockIndex}
    : undefined
}

/**
 * @public
 */
export const getFocusListBlock: EditorSelector<
  {node: PortableTextListBlock; path: KeyedBlockPath} | undefined
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
  {node: PortableTextTextBlock; path: KeyedBlockPath; index: number} | undefined
> = (snapshot) => {
  const focusBlock = getFocusBlock(snapshot)

  return focusBlock && isTextBlock(snapshot.context, focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path, index: focusBlock.index}
    : undefined
}

/**
 * @public
 */
export const getFocusBlockObject: EditorSelector<
  {node: PortableTextObject; path: KeyedBlockPath; index: number} | undefined
> = (snapshot) => {
  const focusBlock = getFocusBlock(snapshot)

  return focusBlock && !isTextBlock(snapshot.context, focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path, index: focusBlock.index}
    : undefined
}

/**
 * @public
 */
export const getFocusChild: EditorSelector<
  | {
      node: PortableTextObject | PortableTextSpan
      path: KeyedChildPath
      blockIndex: number
      index: number
    }
  | undefined
> = (snapshot) => {
  const indexedSelection = getIndexedSelection(
    snapshot.context.schema,
    snapshot.context.value,
    snapshot.context.selection,
  )

  if (!indexedSelection) {
    return undefined
  }

  const focusBlock = getFocusTextBlock(snapshot)

  if (!focusBlock) {
    return undefined
  }

  const childIndex = indexedSelection.focus.path.at(1)
  const node =
    childIndex !== undefined
      ? focusBlock.node.children.at(childIndex)
      : undefined

  return node && childIndex !== undefined
    ? {
        node,
        path: [...focusBlock.path, 'children', {_key: node._key}],
        blockIndex: focusBlock.index,
        index: childIndex,
      }
    : undefined
}

/**
 * @public
 */
export const getFocusSpan: EditorSelector<
  | {
      node: PortableTextSpan
      path: KeyedChildPath
      blockIndex: number
      index: number
    }
  | undefined
> = (snapshot) => {
  const focusChild = getFocusChild(snapshot)

  return focusChild && isSpan(snapshot.context, focusChild.node)
    ? {
        node: focusChild.node,
        path: focusChild.path,
        blockIndex: focusChild.blockIndex,
        index: focusChild.index,
      }
    : undefined
}

/**
 * @public
 */
export const getFirstBlock: EditorSelector<
  {node: PortableTextBlock; path: KeyedBlockPath; index: number} | undefined
> = (snapshot) => {
  const node = snapshot.context.value[0]

  return node ? {node, path: [{_key: node._key}], index: 0} : undefined
}

/**
 * @public
 */
export const getLastBlock: EditorSelector<
  {node: PortableTextBlock; path: KeyedBlockPath; index: number} | undefined
> = (snapshot) => {
  const node = snapshot.context.value[snapshot.context.value.length - 1]
    ? snapshot.context.value[snapshot.context.value.length - 1]
    : undefined

  return node
    ? {
        node,
        path: [{_key: node._key}],
        index: snapshot.context.value.length - 1,
      }
    : undefined
}

/**
 * @public
 */
export const getSelectedBlocks: EditorSelector<
  Array<{node: PortableTextBlock; path: KeyedBlockPath}>
> = (snapshot) => {
  const indexedSelection = getIndexedSelection(
    snapshot.context.schema,
    snapshot.context.value,
    snapshot.context.selection,
  )

  if (!indexedSelection) {
    return []
  }

  const selectedBlocks: Array<{node: PortableTextBlock; path: KeyedBlockPath}> =
    []

  const startPoint = getIndexedSelectionPoint(
    snapshot.context.schema,
    snapshot.context.value,
    getSelectionStartPoint(indexedSelection),
  )
  const startIndex = startPoint ? startPoint.path.at(0) : undefined
  const startKey =
    startIndex !== undefined
      ? snapshot.context.value.at(startIndex)?._key
      : undefined
  const endPoint = getIndexedSelectionPoint(
    snapshot.context.schema,
    snapshot.context.value,
    getSelectionEndPoint(indexedSelection),
  )
  const endIndex = endPoint ? endPoint.path.at(0) : undefined
  const endKey =
    endIndex !== undefined
      ? snapshot.context.value.at(endIndex)?._key
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
      path: KeyedBlockPath
      index: number
    }
  | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const startPoint = getIndexedSelectionPoint(
    snapshot.context.schema,
    snapshot.context.value,
    getSelectionStartPoint(snapshot.context.selection),
  )
  const startIndex = startPoint ? startPoint.path.at(0) : undefined

  const node =
    startIndex !== undefined ? snapshot.context.value.at(startIndex) : undefined

  return node && startIndex !== undefined
    ? {node, path: [{_key: node._key}], index: startIndex}
    : undefined
}

/**
 * @public
 */
export const getSelectionEndBlock: EditorSelector<
  | {
      node: PortableTextBlock
      path: KeyedBlockPath
      index: number
    }
  | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const endPoint = getIndexedSelectionPoint(
    snapshot.context.schema,
    snapshot.context.value,
    getSelectionEndPoint(snapshot.context.selection),
  )
  const endIndex = endPoint ? endPoint.path.at(0) : undefined
  const node =
    endIndex !== undefined ? snapshot.context.value.at(endIndex) : undefined

  return node && endIndex !== undefined
    ? {node, path: [{_key: node._key}], index: endIndex}
    : undefined
}

/**
 * @public
 */
export const getPreviousBlock: EditorSelector<
  {node: PortableTextBlock; path: KeyedBlockPath; index: number} | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const startPoint = getIndexedSelectionPoint(
    snapshot.context.schema,
    snapshot.context.value,
    getSelectionStartPoint(snapshot.context.selection),
  )
  const startIndex = startPoint ? startPoint.path.at(0) : undefined
  const previousIndex =
    startIndex !== undefined && startIndex > 0 ? startIndex - 1 : undefined

  const previousBlock =
    previousIndex !== undefined
      ? snapshot.context.value.at(previousIndex)
      : undefined

  return previousBlock && previousIndex !== undefined
    ? {
        node: previousBlock,
        path: [{_key: previousBlock._key}],
        index: previousIndex,
      }
    : undefined
}

/**
 * @public
 */
export const getNextBlock: EditorSelector<
  {node: PortableTextBlock; path: KeyedBlockPath; index: number} | undefined
> = (snapshot) => {
  if (!snapshot.context.selection) {
    return undefined
  }

  const endPoint = getIndexedSelectionPoint(
    snapshot.context.schema,
    snapshot.context.value,
    getSelectionEndPoint(snapshot.context.selection),
  )
  const endIndex = endPoint ? endPoint.path.at(0) : undefined
  const nextIndex = endIndex !== undefined ? endIndex + 1 : undefined

  const nextBlock =
    nextIndex !== undefined ? snapshot.context.value.at(nextIndex) : undefined

  return nextBlock && nextIndex !== undefined
    ? {node: nextBlock, path: [{_key: nextBlock._key}], index: nextIndex}
    : undefined
}
