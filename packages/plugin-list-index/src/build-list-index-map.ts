import type {EditorContext, Path} from '@portabletext/editor'
import {isKeyedSegment, isTextBlock} from '@portabletext/editor/utils'

/**
 * Serialize a keyed path to a string using Sanity's bracket notation,
 * e.g. `[{_key: 'k0'}]` becomes `[_key=="k0"]`.
 *
 * Duplicated from the editor's internal `serializePath` rather than
 * imported: exporting it from core would add permanent public API for what
 * is an implementation detail of this plugin.
 */
export function serializePath(path: Path): string {
  return path.reduce<string>((result, segment, index) => {
    if (isKeyedSegment(segment)) {
      return `${result}[_key=="${segment._key}"]`
    }

    const separator = index === 0 ? '' : '.'
    return `${result}${separator}${segment}`
  }, '')
}

/**
 * Compute the list index for every list item block in the value.
 *
 * Returns a fresh `Map` keyed by serialized block path with the 1-based
 * index of the block within its list, honoring list type and indentation
 * level: same-type items count up across consecutive blocks on the same
 * level, deeper levels restart at 1, and non-list blocks break the
 * sequence.
 *
 * Duplicated from the editor's internal `buildIndexMaps` (the part that
 * fills `listIndexMap`) rather than imported, for the same reason as
 * `serializePath` above. Keep the list semantics in sync with
 * `packages/editor/src/internal-utils/build-index-maps.ts`.
 */
export function buildListIndexMap(
  context: Pick<EditorContext, 'schema' | 'value'>,
): Map<string, number> {
  const listIndexMap = new Map<string, number>()

  // Maps for each list type, keeping track of the current list count for
  // each level.
  const levelIndexMaps = new Map<string, Map<number, number>>()

  let previousListItem:
    | {
        listItem: string
        level: number
      }
    | undefined

  for (const block of context.value) {
    if (block === undefined) {
      continue
    }

    // Clear the state if we encounter a non-text block. Unlike the engine's
    // internal check, `isTextBlock` also requires `children`, which holds
    // for the post-apply snapshot values this plugin reads.
    if (!isTextBlock(context, block)) {
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
        if (block.level !== undefined && level >= block.level) {
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

  return listIndexMap
}
