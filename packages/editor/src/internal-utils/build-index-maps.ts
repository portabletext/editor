import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorContext} from '../editor/editor-snapshot'
import {isTextBlockNode} from '../slate/node/is-text-block-node'

type ListState = {
  previousListItem:
    | {
        listItem: string
        level: number
      }
    | undefined
  levelIndexMaps: Map<string, Map<number, number>>
}

function createListState(): ListState {
  return {
    previousListItem: undefined,
    levelIndexMaps: new Map(),
  }
}

function walkBlock(
  context: Pick<EditorContext, 'schema' | 'containers'>,
  block: unknown,
  scopeChain: string,
  listIndexMap: Map<string, number>,
  state: ListState,
): void {
  if (!isTextBlockNode(context, block)) {
    state.levelIndexMaps.clear()
    state.previousListItem = undefined

    maybeRecurseIntoContainer(context, block, scopeChain, listIndexMap)
    return
  }

  if (block.listItem === undefined || block.level === undefined) {
    state.levelIndexMaps.clear()
    state.previousListItem = undefined

    maybeRecurseIntoContainer(context, block, scopeChain, listIndexMap)
    return
  }

  if (!state.previousListItem) {
    const listIndex = 1
    const levelIndexMap =
      state.levelIndexMaps.get(block.listItem) ?? new Map<number, number>()
    levelIndexMap.set(block.level, listIndex)
    state.levelIndexMaps.set(block.listItem, levelIndexMap)

    listIndexMap.set(block._key, listIndex)

    state.previousListItem = {
      listItem: block.listItem,
      level: block.level,
    }

    maybeRecurseIntoContainer(context, block, scopeChain, listIndexMap)
    return
  }

  if (
    state.previousListItem.listItem === block.listItem &&
    state.previousListItem.level < block.level
  ) {
    const listIndex = 1
    const levelIndexMap =
      state.levelIndexMaps.get(block.listItem) ?? new Map<number, number>()
    levelIndexMap.set(block.level, listIndex)
    state.levelIndexMaps.set(block.listItem, levelIndexMap)

    listIndexMap.set(block._key, listIndex)

    state.previousListItem = {
      listItem: block.listItem,
      level: block.level,
    }

    maybeRecurseIntoContainer(context, block, scopeChain, listIndexMap)
    return
  }

  state.levelIndexMaps.forEach((levelIndexMap, listItem) => {
    if (listItem === block.listItem) {
      return
    }

    const levelsToDelete: number[] = []

    levelIndexMap.forEach((_, level) => {
      if (level >= block.level!) {
        levelsToDelete.push(level)
      }
    })

    levelsToDelete.forEach((level) => {
      levelIndexMap.delete(level)
    })
  })

  const levelIndexMap =
    state.levelIndexMaps.get(block.listItem) ?? new Map<number, number>()
  const levelCounter = levelIndexMap.get(block.level) ?? 0
  levelIndexMap.set(block.level, levelCounter + 1)
  state.levelIndexMaps.set(block.listItem, levelIndexMap)

  listIndexMap.set(block._key, levelCounter + 1)

  state.previousListItem = {
    listItem: block.listItem,
    level: block.level,
  }

  maybeRecurseIntoContainer(context, block, scopeChain, listIndexMap)
}

function maybeRecurseIntoContainer(
  context: Pick<EditorContext, 'schema' | 'containers'>,
  block: unknown,
  scopeChain: string,
  listIndexMap: Map<string, number>,
): void {
  if (typeof block !== 'object' || block === null) {
    return
  }
  const typed = block as {_type?: unknown}
  if (typeof typed._type !== 'string') {
    return
  }

  const nextScope = scopeChain ? `${scopeChain}.${typed._type}` : typed._type
  const containerConfig = context.containers.get(nextScope)
  if (!containerConfig) {
    return
  }

  const children = (block as Record<string, unknown>)[
    containerConfig.field.name
  ]
  if (!Array.isArray(children)) {
    return
  }

  // Each container field is its own list-counter scope.
  const innerState = createListState()

  for (const child of children) {
    walkBlock(context, child, nextScope, listIndexMap, innerState)
  }
}

/**
 * Mutates the maps in place.
 */
export function buildIndexMaps(
  context: Pick<EditorContext, 'schema' | 'containers' | 'value'>,
  {
    blockIndexMap,
    listIndexMap,
  }: {
    blockIndexMap: Map<string, number>
    listIndexMap: Map<string, number>
  },
): void {
  blockIndexMap.clear()
  listIndexMap.clear()

  const rootState = createListState()

  for (let blockIndex = 0; blockIndex < context.value.length; blockIndex++) {
    const block = context.value.at(blockIndex)

    if (block === undefined) {
      continue
    }

    blockIndexMap.set(block._key, blockIndex)

    walkBlock(context, block as PortableTextBlock, '', listIndexMap, rootState)
  }
}
