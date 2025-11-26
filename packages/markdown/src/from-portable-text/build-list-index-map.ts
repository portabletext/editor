import {
  compileSchema,
  defineSchema,
  isTextBlock,
  type PortableTextBlock,
} from '@portabletext/schema'
import type {ArbitraryTypedObject, TypedObject} from '@portabletext/types'
import {defaultKeyGenerator} from '../key-generator'

const schema = compileSchema(defineSchema({}))

/**
 * Builds a map of list item `_key`s to their index.
 *
 * Mutates the blocks in place by adding a `_key` if necessary.
 */
export function buildListIndexMap<
  Block extends TypedObject = PortableTextBlock | ArbitraryTypedObject,
>(blocks: Array<Block>): Map<string, number> {
  const levelIndexMaps = new Map<string, Map<number, number>>()
  const listIndexMap = new Map<string, number>()

  let previousListItem:
    | {
        listItem: string
        level: number
      }
    | undefined

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
    const block = blocks.at(blockIndex)

    if (block === undefined) {
      continue
    }

    if (!block._key) {
      block._key = defaultKeyGenerator()
    }

    // Clear the state if we encounter a non-text block
    if (!isTextBlock({schema}, block)) {
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

      listIndexMap.set(block._key, listIndex)

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

      listIndexMap.set(block._key, listIndex)

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

    listIndexMap.set(block._key, levelCounter + 1)

    previousListItem = {
      listItem: block.listItem,
      level: block.level,
    }
  }

  return listIndexMap
}
