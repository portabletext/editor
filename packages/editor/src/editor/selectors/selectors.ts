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
import {createGuards} from '../behavior/behavior.guards'
import type {EditorSelector} from '../editor-selector'

export const selectionIsCollapsed: EditorSelector<boolean> = ({context}) => {
  return (
    JSON.stringify(context.selection?.anchor.path) ===
      JSON.stringify(context.selection?.focus.path) &&
    context.selection?.anchor.offset === context.selection?.focus.offset
  )
}

export const getFocusBlock: EditorSelector<
  {node: PortableTextBlock; path: [KeyedSegment]} | undefined
> = ({context}) => {
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

export const getFocusListBlock: EditorSelector<
  {node: PortableTextListBlock; path: [KeyedSegment]} | undefined
> = ({context}) => {
  const guards = createGuards(context)
  const focusBlock = getFocusBlock({context})

  return focusBlock && guards.isListBlock(focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}

export const getFocusTextBlock: EditorSelector<
  {node: PortableTextTextBlock; path: [KeyedSegment]} | undefined
> = ({context}) => {
  const focusBlock = getFocusBlock({context})

  return focusBlock && isPortableTextTextBlock(focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}

export const getFocusBlockObject: EditorSelector<
  {node: PortableTextObject; path: [KeyedSegment]} | undefined
> = ({context}) => {
  const focusBlock = getFocusBlock({context})

  return focusBlock && !isPortableTextTextBlock(focusBlock.node)
    ? {node: focusBlock.node, path: focusBlock.path}
    : undefined
}

export const getFocusChild: EditorSelector<
  | {
      node: PortableTextObject | PortableTextSpan
      path: [KeyedSegment, 'children', KeyedSegment]
    }
  | undefined
> = ({context}) => {
  const focusBlock = getFocusTextBlock({context})

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

export const getFocusSpan: EditorSelector<
  | {node: PortableTextSpan; path: [KeyedSegment, 'children', KeyedSegment]}
  | undefined
> = ({context}) => {
  const focusChild = getFocusChild({context})

  return focusChild && isPortableTextSpan(focusChild.node)
    ? {node: focusChild.node, path: focusChild.path}
    : undefined
}

export const getFirstBlock: EditorSelector<
  {node: PortableTextBlock; path: [KeyedSegment]} | undefined
> = ({context}) => {
  const node = context.value[0]

  return node ? {node, path: [{_key: node._key}]} : undefined
}

export const getLastBlock: EditorSelector<
  {node: PortableTextBlock; path: [KeyedSegment]} | undefined
> = ({context}) => {
  const node = context.value[context.value.length - 1]
    ? context.value[context.value.length - 1]
    : undefined

  return node ? {node, path: [{_key: node._key}]} : undefined
}

export const getSelectedBlocks: EditorSelector<
  Array<{node: PortableTextBlock; path: [KeyedSegment]}>
> = ({context}) => {
  if (!context.selection) {
    return []
  }

  const selectedBlocks: Array<{node: PortableTextBlock; path: [KeyedSegment]}> =
    []
  const startKey = context.selection.backward
    ? isKeySegment(context.selection.focus.path[0])
      ? context.selection.focus.path[0]._key
      : undefined
    : isKeySegment(context.selection.anchor.path[0])
      ? context.selection.anchor.path[0]._key
      : undefined
  const endKey = context.selection.backward
    ? isKeySegment(context.selection.anchor.path[0])
      ? context.selection.anchor.path[0]._key
      : undefined
    : isKeySegment(context.selection.focus.path[0])
      ? context.selection.focus.path[0]._key
      : undefined

  if (!startKey || !endKey) {
    return selectedBlocks
  }

  for (const block of context.value) {
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

export const getSelectionStartBlock: EditorSelector<
  | {
      node: PortableTextBlock
      path: [KeyedSegment]
    }
  | undefined
> = ({context}) => {
  if (!context.selection) {
    return undefined
  }

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

export const getSelectionEndBlock: EditorSelector<
  | {
      node: PortableTextBlock
      path: [KeyedSegment]
    }
  | undefined
> = ({context}) => {
  if (!context.selection) {
    return undefined
  }

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

export const getPreviousBlock: EditorSelector<
  {node: PortableTextBlock; path: [KeyedSegment]} | undefined
> = ({context}) => {
  let previousBlock: {node: PortableTextBlock; path: [KeyedSegment]} | undefined
  const selectionStartBlock = getSelectionStartBlock({context})

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

export const getNextBlock: EditorSelector<
  {node: PortableTextBlock; path: [KeyedSegment]} | undefined
> = ({context}) => {
  let nextBlock: {node: PortableTextBlock; path: [KeyedSegment]} | undefined
  const selectionEndBlock = getSelectionEndBlock({context})

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
