import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorContext, EditorSnapshot} from '../editor/editor-snapshot'
import type {Node} from '../engine/interfaces/node'
import type {Path} from '../engine/interfaces/path'
import {isTextBlockNode} from '../engine/node/is-text-block-node'
import {serializePath} from '../paths/serialize-path'
import type {RegisteredContainer} from '../schema/container-types'
import {getNodeChildren} from '../traversal/get-children'
import type {KeyedSegment} from '../types/paths'

// Maps for each list type, keeping track of the current list count for each
// level.
const levelIndexMaps = new Map<string, Map<number, number>>()

/**
 * Mutates both maps in place. Used for initial engine population and tests.
 *
 * During operation application `blockIndexMap` is maintained incrementally by
 * `transform-block-index-map` helpers; only `listIndexMap` needs a full
 * rebuild per op (see `buildListIndexMap`).
 */
export function buildIndexMaps(
  context: Pick<EditorContext, 'schema' | 'value' | 'containers'>,
  {
    blockIndexMap,
    listIndexMap,
  }: {
    blockIndexMap: Map<string, number>
    listIndexMap: Map<string, number>
  },
): void {
  blockIndexMap.clear()
  for (let blockIndex = 0; blockIndex < context.value.length; blockIndex++) {
    const block = context.value.at(blockIndex)
    if (block === undefined || block._key === undefined) {
      // Unkeyed transient blocks (e.g. inserted by a remote patch before
      // normalization assigns a `_key`) cannot be addressed by keyed path,
      // so they are not indexed — mirroring `collectDescendantIndexes`.
      continue
    }
    const blockSegment: KeyedSegment = {_key: block._key}
    const blockPath: Path = [blockSegment]
    const blockKey = serializePath(blockPath)
    if (!blockIndexMap.has(blockKey)) {
      blockIndexMap.set(blockKey, blockIndex)
    }
    collectDescendantIndexes(
      context,
      block,
      blockPath,
      undefined,
      blockIndexMap,
    )
  }
  buildListIndexMap(context, listIndexMap)
}

/**
 * Mutates `listIndexMap` in place. Recomputes list-item indices for every
 * root block. Called per op by `updateValuePlugin` because list-item
 * numbering depends on root-block adjacency, which any structural op can
 * disturb non-locally.
 */
export function buildListIndexMap(
  context: Pick<EditorContext, 'schema' | 'value' | 'containers'>,
  listIndexMap: Map<string, number>,
): void {
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

    const blockSegment: KeyedSegment = {_key: block._key}
    const blockPath: Path = [blockSegment]

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

    listIndexMap.set(serializePath(blockPath), levelCounter + 1)

    previousListItem = {
      listItem: block.listItem,
      level: block.level,
    }
  }
}

export function collectDescendantIndexes(
  context: Pick<EditorContext, 'schema' | 'containers'>,
  node: Node,
  nodePath: Path,
  parent: RegisteredContainer | undefined,
  blockIndexMap: Map<string, number>,
): void {
  const result = getNodeChildren(context, node, parent)
  if (!result) {
    return
  }

  for (let i = 0; i < result.children.length; i++) {
    const child = result.children[i]!
    if (!child._key) {
      continue
    }

    const childSegment: KeyedSegment = {_key: child._key}
    const childPath: Path = [...nodePath, result.fieldName, childSegment]
    const childKey = serializePath(childPath)
    if (!blockIndexMap.has(childKey)) {
      blockIndexMap.set(childKey, i)
    }

    collectDescendantIndexes(
      context,
      child,
      childPath,
      result.parent,
      blockIndexMap,
    )
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
  const containers = input.containers ?? new Map()
  buildIndexMaps(
    {schema: input.schema, value: input.value, containers},
    {blockIndexMap, listIndexMap},
  )
  return {
    context: {
      containers,
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
