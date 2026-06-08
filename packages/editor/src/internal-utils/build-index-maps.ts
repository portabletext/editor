import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import {isTextBlockNode} from '../engine/node/is-text-block-node'
import {serializePath} from '../paths/serialize-path'

// Maps for each list type, keeping track of the current list count for each
// level.
const levelIndexMaps = new Map<string, Map<number, number>>()

/**
 * Mutates the maps in place.
 */
export function buildIndexMaps(
  context: Pick<EditorContext, 'schema' | 'value'>,
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
  levelIndexMaps.clear()

  let previousListItem:
    | {
        listItem: string
        level: number
      }
    | undefined

  for (let blockIndex = 0; blockIndex < context.value.length; blockIndex++) {
    const block = context.value.at(blockIndex)

    if (block === undefined) {
      continue
    }

    blockIndexMap.set(block._key, blockIndex)

    // Clear the state if we encounter a non-text block
    if (!isTextBlockNode(context, block)) {
      levelIndexMaps.clear()
      previousListItem = undefined

      continue
    }

    // Clear the state if we encounter a non-list text block
    if (block.listItem === undefined || block.level === undefined) {
      levelIndexMaps.clear()
      previousListItem = undefined

      continue
    }

    // If we encounter a new list item, we set the initial index to 1 for the
    // list type on that level.
    if (!previousListItem) {
      const listIndex = 1
      const levelIndexMap =
        levelIndexMaps.get(block.listItem) ?? new Map<number, number>()
      levelIndexMap.set(block.level, listIndex)
      levelIndexMaps.set(block.listItem, levelIndexMap)

      listIndexMap.set(serializePath([{_key: block._key}]), listIndex)

      previousListItem = {
        listItem: block.listItem,
        level: block.level,
      }

      continue
    }

    // If the previous list item is of the same type but on a lower level, we
    // need to reset the level index map for that type.
    if (
      previousListItem.listItem === block.listItem &&
      previousListItem.level < block.level
    ) {
      const listIndex = 1
      const levelIndexMap =
        levelIndexMaps.get(block.listItem) ?? new Map<number, number>()
      levelIndexMap.set(block.level, listIndex)
      levelIndexMaps.set(block.listItem, levelIndexMap)

      listIndexMap.set(serializePath([{_key: block._key}]), listIndex)

      previousListItem = {
        listItem: block.listItem,
        level: block.level,
      }

      continue
    }

    // Reset other list types at current level and deeper
    levelIndexMaps.forEach((levelIndexMap, listItem) => {
      if (listItem === block.listItem) {
        return
      }

      // Reset all levels that are >= current level
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
      levelIndexMaps.get(block.listItem) ?? new Map<number, number>()
    const levelCounter = levelIndexMap.get(block.level) ?? 0
    levelIndexMap.set(block.level, levelCounter + 1)
    levelIndexMaps.set(block.listItem, levelIndexMap)

    listIndexMap.set(serializePath([{_key: block._key}]), levelCounter + 1)

    previousListItem = {
      listItem: block.listItem,
      level: block.level,
    }
  }
}

// Build a complete `EditorSnapshot` for tests. Populates
// `blockIndexMap` and `listIndexMap` via `buildIndexMaps` so consumers
// can assume the invariant that production maintains.
export function createTestSnapshot(input: {
  value: Array<PortableTextBlock>
  schema: EditorContext['schema']
  containers?: EditorContext['containers']
  selection?: EditorContext['selection']
}): EditorSnapshot {
  const blockIndexMap = new Map<string, number>()
  const listIndexMap = new Map<string, number>()
  buildIndexMaps(
    {schema: input.schema, value: input.value},
    {blockIndexMap, listIndexMap},
  )
  return {
    context: {
      containers: input.containers ?? new Map(),
      converters: [],
      keyGenerator: () => '',
      readOnly: false,
      schema: input.schema,
      selection: input.selection ?? null,
      value: input.value,
    },
    blockIndexMap,
    decoratorState: {},
  }
}
