import type {
  EditorContext,
  Path,
  RegisteredContainer,
} from '@portabletext/editor'
import {getContainerChildren} from '@portabletext/editor/traversal'
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

// `containers` is optional: the production caller passes the full snapshot
// context, while the flat (top-level only) test scenarios omit it. Without
// containers, container blocks resolve to no children and are not descended,
// the pre-container behavior.
type ListIndexInput = Pick<EditorContext, 'schema' | 'value'> &
  Partial<Pick<EditorContext, 'containers'>>

type TraversalContext = Pick<EditorContext, 'schema' | 'containers'>

// The block type `getContainerChildren` yields. `Node` is not public, so
// derive it from the (public) traversal primitive rather than naming it.
type Block = NonNullable<
  ReturnType<typeof getContainerChildren>
>['children'][number]

/**
 * Compute the list index for every list item block in the value, at any
 * depth.
 *
 * Returns a fresh `Map` keyed by the serialized full block path with the
 * 1-based index of the block within its list, honoring list type and
 * indentation level: same-type items count up across consecutive blocks on
 * the same level, deeper levels restart at 1, and non-list blocks break the
 * sequence. List items nested inside a container (e.g. a table cell) number
 * within their own array, independently of siblings and the enclosing array.
 *
 * Duplicated from the editor's internal `buildIndexMaps` (the part that fills
 * `listIndexMap`) rather than imported, for the same reason as `serializePath`
 * above. Descends containers with the public `getContainerChildren`, seeding
 * the document root from `context.value`. Keep the numbering semantics in sync
 * with `packages/editor/src/internal-utils/build-index-maps.ts`.
 */
export function buildListIndexMap(
  context: ListIndexInput,
): Map<string, number> {
  const listIndexMap = new Map<string, number>()
  const traversalContext: TraversalContext = {
    schema: context.schema,
    containers: context.containers ?? new Map<string, RegisteredContainer>(),
  }
  collectListIndexes(
    traversalContext,
    context.value,
    [],
    undefined,
    listIndexMap,
  )
  return listIndexMap
}

/**
 * Walk one block array, numbering its list items, then descend into any
 * container blocks. List state is scoped per array: a list inside a container
 * numbers independently, so each array starts fresh from 1.
 */
function collectListIndexes(
  context: TraversalContext,
  blocks: ReadonlyArray<Block | undefined>,
  basePath: Path,
  parent: RegisteredContainer | undefined,
  listIndexMap: Map<string, number>,
): void {
  const levelIndexMaps = new Map<string, Map<number, number>>()

  let previousListItem:
    | {
        listItem: string
        level: number
      }
    | undefined

  for (const block of blocks) {
    if (block === undefined || block._key === undefined) {
      continue
    }

    const blockPath: Path = [...basePath, {_key: block._key}]

    // A non-list block breaks the list run for this array. Containers are
    // descended into; each nested array numbers independently.
    //
    // Unlike the engine's internal `isTextBlockNode`, `isTextBlock` also
    // requires `children`, which holds for the post-apply snapshot values
    // this plugin reads.
    if (
      !isTextBlock(context, block) ||
      block.listItem === undefined ||
      block.level === undefined
    ) {
      levelIndexMaps.clear()
      previousListItem = undefined

      const childResult = getContainerChildren(
        context.containers,
        block,
        parent,
      )
      if (childResult) {
        collectListIndexes(
          context,
          childResult.children,
          [...blockPath, childResult.container.field.name],
          childResult.container,
          listIndexMap,
        )
      }

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

      listIndexMap.set(serializePath(blockPath), listIndex)

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

      listIndexMap.set(serializePath(blockPath), listIndex)

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

    listIndexMap.set(serializePath(blockPath), levelCounter + 1)

    previousListItem = {
      listItem: block.listItem,
      level: block.level,
    }
  }
}
