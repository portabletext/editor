import type {PortableTextBlock} from '@portabletext/schema'
import type {Operation as SlateOperation} from 'slate'
import type {EditorContext} from '../editor/editor-snapshot'

/**
 * A single entry in the block map, representing a block's position
 * in the document and in the reading-order linked list.
 *
 * The block node itself is not stored here. Use `context.value[entry.index]`
 * to access the block. This keeps the map as a pure index with no data
 * duplication.
 *
 * @internal
 */
export type BlockMapEntry = {
  index: number
  prev: string | null
  next: string | null
  parent: string | null
  field: string | null
}

/**
 * A map of all blocks in the document, threaded in document reading
 * order via `prev`/`next` pointers.
 *
 * Keys are path-based identifiers computed by `blockMapKey()`.
 * For top-level blocks, the key is the block's `_key`.
 * For nested blocks (containers), the key will encode the full path
 * from the document root, since `_key` is only unique among siblings,
 * not globally across the document.
 *
 * Supports O(1) block lookup, O(1) next/prev navigation at any depth.
 *
 * @internal
 */
export type BlockMap = Map<string, BlockMapEntry>

/**
 * Compute the map key for a block given its `_key` and optional
 * parent map key and field name.
 *
 * For top-level blocks, the key is just the block's `_key`.
 * For nested blocks inside containers, the key encodes the path
 * from the document root: `parentMapKey/field/blockKey`.
 *
 * This uses `/` as a separator. Since `_key` values can technically
 * contain any character, the encoding is length-prefixed per segment
 * to avoid ambiguity:
 *   top-level: `"abc123"` (bare key, no encoding needed)
 *   nested: `"12:containerKey/7:content/8:blockKey"`
 *
 * For flat documents (today), this always returns the bare `_key`.
 */
export function blockMapKey(
  blockKey: string,
  parentMapKey?: string | null,
  field?: string | null,
): string {
  if (!parentMapKey) {
    return blockKey
  }
  return `${parentMapKey}/${String(field?.length ?? 0)}:${field ?? ''}/${String(blockKey.length)}:${blockKey}`
}

/**
 * Build the block map from scratch by walking the value depth-first.
 * Called on initial mount and as a fallback when surgical updates
 * can't handle an operation.
 *
 * Mutates the map in place (clears it first).
 */
export function buildBlockMap(
  context: Pick<EditorContext, 'value'>,
  blockMap: BlockMap,
): void {
  blockMap.clear()

  let prevKey: string | null = null

  for (let i = 0; i < context.value.length; i++) {
    const block = context.value[i]

    if (!block) {
      continue
    }

    const mapKey = blockMapKey(block._key)

    const entry: BlockMapEntry = {
      index: i,
      prev: prevKey,
      next: null,
      parent: null,
      field: null,
    }

    blockMap.set(mapKey, entry)

    // Link previous entry to this one
    if (prevKey !== null) {
      const prevEntry = blockMap.get(prevKey)
      if (prevEntry) {
        prevEntry.next = mapKey
      }
    }

    prevKey = mapKey

    // Container walking will be added here when containerTypes
    // are added to the schema. For now, flat documents only.
    // The walk will recurse into container fields, calling
    // blockMapKey(childKey, mapKey, fieldName) to produce
    // path-based keys for nested blocks.
  }
}

/**
 * Find the map key for the entry at a given index.
 * Returns null if no entry has that index.
 *
 * For surgical updates, we sometimes need to find an entry by its
 * position rather than its key.
 */
function findKeyByIndex(blockMap: BlockMap, index: number): string | null {
  for (const [key, entry] of blockMap) {
    if (entry.index === index) {
      return key
    }
  }
  return null
}

/**
 * Bump the index of every entry with index >= startIndex by the given delta.
 */
function shiftIndices(
  blockMap: BlockMap,
  startIndex: number,
  delta: number,
): void {
  for (const entry of blockMap.values()) {
    if (entry.index >= startIndex) {
      entry.index += delta
    }
  }
}

/**
 * Surgically insert a block entry at the given index.
 * Splices into the prev/next chain and bumps indices.
 */
function insertEntry(blockMap: BlockMap, mapKey: string, index: number): void {
  // Bump indices of all blocks at or after this position
  shiftIndices(blockMap, index, 1)

  // Find the entries that should be before and after the new entry
  const prevMapKey = findKeyByIndex(blockMap, index - 1)
  const prevEntry = prevMapKey ? blockMap.get(prevMapKey) : undefined
  const nextMapKey = prevEntry
    ? prevEntry.next
    : findKeyByIndex(blockMap, index + 1)
  const nextEntry = nextMapKey ? blockMap.get(nextMapKey) : undefined

  // Create the new entry
  const entry: BlockMapEntry = {
    index,
    prev: prevMapKey,
    next: nextMapKey,
    parent: null,
    field: null,
  }

  blockMap.set(mapKey, entry)

  // Splice into the chain
  if (prevEntry) {
    prevEntry.next = mapKey
  }
  if (nextEntry) {
    nextEntry.prev = mapKey
  }
}

/**
 * Surgically remove a block entry at the given map key.
 * Unlinks from the prev/next chain and decrements indices.
 */
function removeEntry(blockMap: BlockMap, mapKey: string): void {
  const entry = blockMap.get(mapKey)
  if (!entry) {
    return
  }

  // Unlink from chain
  if (entry.prev) {
    const prevEntry = blockMap.get(entry.prev)
    if (prevEntry) {
      prevEntry.next = entry.next
    }
  }
  if (entry.next) {
    const nextEntry = blockMap.get(entry.next)
    if (nextEntry) {
      nextEntry.prev = entry.prev
    }
  }

  const removedIndex = entry.index
  blockMap.delete(mapKey)

  // Decrement indices of all blocks after the removed one
  shiftIndices(blockMap, removedIndex, -1)
}

/**
 * Update the block map after a Slate operation.
 *
 * For text edits and selection changes, this is a no-op.
 * For block-level structural operations, performs surgical updates:
 * splicing entries in/out of the linked list and adjusting indices.
 * For child-level operations (path.length > 1), the block map
 * is unaffected.
 *
 * Falls back to a full rebuild if the operation can't be handled
 * surgically (e.g., move_node).
 *
 * Returns true if the map was updated, false if no update was needed.
 */
export function updateBlockMap(
  context: Pick<EditorContext, 'value'>,
  blockMap: BlockMap,
  operation: SlateOperation,
): boolean {
  switch (operation.type) {
    // Text and selection operations don't affect block structure
    case 'set_selection':
    case 'insert_text':
    case 'remove_text':
      return false

    case 'set_node': {
      // Only care about block-level set_node (path.length === 1)
      if (operation.path.length !== 1) {
        return false
      }

      const blockIndex = operation.path[0]
      if (blockIndex === undefined) {
        return false
      }

      const block = context.value[blockIndex]
      if (!block) {
        return false
      }

      const newMapKey = blockMapKey(block._key)

      // Check if the key changed by looking for the old entry at this index
      if (blockMap.has(newMapKey)) {
        // Key didn't change, nothing to do
        return false
      }

      // Key changed: find the old entry by index, re-key it
      const oldMapKey = findKeyByIndex(blockMap, blockIndex)
      if (oldMapKey) {
        const entry = blockMap.get(oldMapKey)!

        // Update prev/next references that point to the old key
        if (entry.prev) {
          const prevEntry = blockMap.get(entry.prev)
          if (prevEntry) {
            prevEntry.next = newMapKey
          }
        }
        if (entry.next) {
          const nextEntry = blockMap.get(entry.next)
          if (nextEntry) {
            nextEntry.prev = newMapKey
          }
        }

        blockMap.delete(oldMapKey)
        blockMap.set(newMapKey, entry)
      }

      return true
    }

    case 'insert_node': {
      // Only care about block-level inserts (path.length === 1)
      if (operation.path.length !== 1) {
        return false
      }

      const blockIndex = operation.path[0]
      if (blockIndex === undefined) {
        return false
      }

      const block = context.value[blockIndex] as PortableTextBlock | undefined
      if (!block) {
        // Fallback to rebuild
        buildBlockMap(context, blockMap)
        return true
      }

      const mapKey = blockMapKey(block._key)
      insertEntry(blockMap, mapKey, blockIndex)
      return true
    }

    case 'remove_node': {
      // Only care about block-level removes (path.length === 1)
      if (operation.path.length !== 1) {
        return false
      }

      // The node in the operation has the _key of the removed block
      const removedNode = operation.node as PortableTextBlock | undefined
      if (!removedNode?._key) {
        buildBlockMap(context, blockMap)
        return true
      }

      const mapKey = blockMapKey(removedNode._key)
      removeEntry(blockMap, mapKey)
      return true
    }

    case 'split_node': {
      // Only care about block-level splits (path.length === 1)
      // A split at [i] creates a new block at [i+1]
      if (operation.path.length !== 1) {
        return false
      }

      const blockIndex = operation.path[0]
      if (blockIndex === undefined) {
        return false
      }

      // The new block is at blockIndex + 1 after the split
      const newBlock = context.value[blockIndex + 1] as
        | PortableTextBlock
        | undefined
      if (!newBlock?._key) {
        buildBlockMap(context, blockMap)
        return true
      }

      const mapKey = blockMapKey(newBlock._key)
      insertEntry(blockMap, mapKey, blockIndex + 1)
      return true
    }

    case 'merge_node': {
      // Only care about block-level merges (path.length === 1)
      // A merge at [i] removes block [i] and merges into [i-1]
      if (operation.path.length !== 1) {
        return false
      }

      const blockIndex = operation.path[0]
      if (blockIndex === undefined) {
        return false
      }

      // Find the entry that was at this index before the merge
      // After the merge, the block at blockIndex is gone, so we need
      // to find it by looking at what's no longer in the value
      // The operation.properties has the merged node's properties
      const mergedKey = (operation.properties as {_key?: string})?._key
      if (!mergedKey) {
        buildBlockMap(context, blockMap)
        return true
      }

      const mapKey = blockMapKey(mergedKey)
      removeEntry(blockMap, mapKey)
      return true
    }

    case 'move_node': {
      // Move is complex: unlink from old, splice into new, fix indices.
      // Fall back to rebuild for correctness.
      buildBlockMap(context, blockMap)
      return true
    }

    default:
      return false
  }
}
