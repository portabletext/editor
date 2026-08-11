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
 * Builds a map of list item `_key`s to their index, and a map of list item
 * `_key`s to the depth they should be rendered at.
 *
 * The depth is not the same as the block's `level`. A list can start at a level
 * deeper than 1, and can skip levels, but Markdown has no way to express either:
 * indentation is relative to the list item above, and indenting a first item by
 * four spaces or more makes it a code block rather than a list. So each jump to a
 * deeper level counts as a single step of nesting, however many levels it spans.
 *
 * Mutates the blocks in place by adding a `_key` if necessary.
 */
export function buildListIndexMap<
  Block extends TypedObject = PortableTextBlock | ArbitraryTypedObject,
>(
  blocks: Array<Block>,
): {listIndexMap: Map<string, number>; listDepthMap: Map<string, number>} {
  const levelIndexMaps = new Map<string, Map<number, number>>()
  const listIndexMap = new Map<string, number>()
  const listDepthMap = new Map<string, number>()

  // Levels of the list items this one is nested inside, shallowest first
  let levelStack: Array<number> = []

  function depthOf(level: number): number {
    let deepest = levelStack.at(-1)

    while (deepest !== undefined && deepest > level) {
      levelStack.pop()
      deepest = levelStack.at(-1)
    }

    if (deepest !== level) {
      levelStack.push(level)
    }

    return levelStack.length - 1
  }

  let previousListItem:
    | {
        listItem: string
        depth: number
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
      levelStack = []

      continue
    }

    // Clear the state if we encounter a non-list text block
    if (block.listItem === undefined || block.level === undefined) {
      levelIndexMaps.clear()
      previousListItem = undefined
      levelStack = []

      continue
    }

    const depth = depthOf(block.level)
    listDepthMap.set(block._key, depth)

    // If we encounter a new list item, we set the initial index to 1 for the
    // list type on that level.
    if (!previousListItem) {
      const listIndex = 1
      const levelIndexMap =
        levelIndexMaps.get(block.listItem) ?? new Map<number, number>()
      levelIndexMap.set(depth, listIndex)
      levelIndexMaps.set(block.listItem, levelIndexMap)

      listIndexMap.set(block._key, listIndex)

      previousListItem = {
        listItem: block.listItem,
        depth,
      }

      continue
    }

    // If the previous list item is of the same type but on a lower level, we
    // need to reset the level index map for that type.
    if (
      previousListItem.listItem === block.listItem &&
      previousListItem.depth < depth
    ) {
      const listIndex = 1
      const levelIndexMap =
        levelIndexMaps.get(block.listItem) ?? new Map<number, number>()
      levelIndexMap.set(depth, listIndex)
      levelIndexMaps.set(block.listItem, levelIndexMap)

      listIndexMap.set(block._key, listIndex)

      previousListItem = {
        listItem: block.listItem,
        depth,
      }

      continue
    }

    // Reset other list types at current depth and deeper
    levelIndexMaps.forEach((levelIndexMap, listItem) => {
      if (listItem === block.listItem) {
        return
      }

      // Reset all levels that are >= current level
      const depthsToDelete: number[] = []

      levelIndexMap.forEach((_, existingDepth) => {
        if (existingDepth >= depth) {
          depthsToDelete.push(existingDepth)
        }
      })

      depthsToDelete.forEach((depthToDelete) => {
        levelIndexMap.delete(depthToDelete)
      })
    })

    const levelIndexMap =
      levelIndexMaps.get(block.listItem) ?? new Map<number, number>()
    const levelCounter = levelIndexMap.get(depth) ?? 0
    levelIndexMap.set(depth, levelCounter + 1)
    levelIndexMaps.set(block.listItem, levelIndexMap)

    listIndexMap.set(block._key, levelCounter + 1)

    previousListItem = {
      listItem: block.listItem,
      depth,
    }
  }

  return {listIndexMap, listDepthMap}
}
