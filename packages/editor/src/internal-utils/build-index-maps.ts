import type {PortableTextBlock} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'
import {isTextBlock} from './parse-blocks'

export function buildIndexMaps(
  context: Pick<EditorContext, 'schema'>,
  value: Array<PortableTextBlock>,
): {
  blockIndexMap: Map<string, number>
  listIndexMap: Map<string, number>
} {
  const blockIndexMap = new Map<string, number>()
  const listIndexMap = new Map<string, number>()
  const levelIndexMap = new Map<number, number>()
  let previousListItem:
    | {
        listItem: string
        level: number
      }
    | undefined

  for (let blockIndex = 0; blockIndex < value.length; blockIndex++) {
    const block = value.at(blockIndex)

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

  return {blockIndexMap, listIndexMap}
}
