import type {EditorContext} from '../editor/editor-snapshot'
import {isTextBlock} from './parse-blocks'

const levelIndexMap = new Map<number, number>()

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
  levelIndexMap.clear()

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

    if (!isTextBlock(context, block)) {
      levelIndexMap.clear()
      previousListItem = undefined
      continue
    }

    if (block.listItem === undefined || block.level === undefined) {
      levelIndexMap.clear()
      previousListItem = undefined
      continue
    }

    if (!previousListItem) {
      previousListItem = {
        listItem: block.listItem,
        level: block.level,
      }
      levelIndexMap.set(block.level, 1)
      listIndexMap.set(block._key, 1)
      continue
    }

    if (previousListItem.listItem !== block.listItem) {
      levelIndexMap.clear()
      previousListItem = {
        listItem: block.listItem,
        level: block.level,
      }
      levelIndexMap.set(block.level, 1)
      listIndexMap.set(block._key, 1)
      continue
    }

    if (previousListItem.level === block.level) {
      const levelCounter = levelIndexMap.get(block.level) ?? 0
      levelIndexMap.set(block.level, levelCounter + 1)
      previousListItem = {
        listItem: block.listItem,
        level: block.level,
      }
      listIndexMap.set(block._key, levelCounter + 1)
      continue
    }

    if (previousListItem.level < block.level) {
      levelIndexMap.set(block.level, 1)
      previousListItem = {
        listItem: block.listItem,
        level: block.level,
      }
      listIndexMap.set(block._key, 1)
      continue
    }

    if (previousListItem.level > block.level) {
      const levelCounter = levelIndexMap.get(block.level) ?? 0
      levelIndexMap.set(block.level, levelCounter + 1)
      previousListItem = {
        listItem: block.listItem,
        level: block.level,
      }
      listIndexMap.set(block._key, levelCounter + 1)
    }
  }
}
