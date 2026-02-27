import type {PortableTextBlock} from '@portabletext/schema'
import type {Operation} from '../slate'

/**
 * Separator used to join key segments in serialized key-paths.
 * PTE `_key` values are alphanumeric and never contain `/`.
 */
const KEY_PATH_SEPARATOR = '/'

/**
 * Serialize an array of key segments into a deterministic string.
 * - Top-level: `["abc"]` → `"abc"`
 * - Nested: `["container", "nested"]` → `"container/nested"`
 * - Deeply nested: `["container", "sub", "block"]` → `"container/sub/block"`
 */
export function serializeKeyPath(keys: string[]): string {
  return keys.join(KEY_PATH_SEPARATOR)
}

/**
 * Helper: exact path equality
 */
function pathEquals(a: number[], b: number[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

/**
 * Helper: does `path` start with `prefix`?
 * Strict descendant check — path must be longer than prefix.
 */
function pathStartsWith(path: number[], prefix: number[]): boolean {
  if (path.length <= prefix.length) {
    return false
  }
  for (let i = 0; i < prefix.length; i++) {
    if (path[i] !== prefix[i]) {
      return false
    }
  }
  return true
}

/**
 * Helper: do two paths share the same parent prefix at a given depth?
 * For depth 0 (top-level), there's no parent prefix to check — all entries match.
 * For depth > 0, the path segments before `depth` must match.
 */
function sharesParentPrefix(
  path: number[],
  reference: number[],
  depth: number,
): boolean {
  if (path.length <= depth) {
    return false
  }
  for (let i = 0; i < depth; i++) {
    if (path[i] !== reference[i]) {
      return false
    }
  }
  return true
}

/**
 * @public
 */
export type BlockPathMap = Pick<
  InternalBlockPathMap,
  'get' | 'getIndex' | 'has' | 'size' | 'entries'
>

/**
 * Maps serialized key-paths to their Slate paths (number[]).
 *
 * The map key is a serialized key-based path, not a bare `_key`.
 * For top-level blocks, the serialized key-path is just the `_key` itself.
 * For nested blocks, it encodes the ancestry: `"parent/child"`.
 *
 * Keys are only unique among siblings, not globally. The serialized key-path
 * ensures uniqueness across the entire tree by encoding the full ancestry.
 *
 * Uses incremental updates — O(affected siblings) instead of O(total blocks).
 *
 * Currently indexes top-level blocks only.
 * Container recursion will be added when container schema support lands.
 *
 * The incremental update methods are already container-aware — they handle
 * paths of any depth and shift descendants correctly.
 */
export class InternalBlockPathMap {
  private map: Map<string, number[]>

  constructor() {
    this.map = new Map()
  }

  /**
   * Serialize an array of key segments into a deterministic string.
   * Static helper exposed on the class for convenience.
   */
  static serializeKeyPath(keys: string[]): string {
    return serializeKeyPath(keys)
  }

  /**
   * O(1) lookup by key-path.
   * Accepts an array of `_key` strings from root to target block.
   * For top-level blocks: `['abc']`
   * For nested blocks: `['container', 'nested']`
   */
  get(keyPath: string[]): number[] | undefined {
    return this.map.get(serializeKeyPath(keyPath))
  }

  /**
   * Existence check by key-path.
   * Accepts an array of `_key` strings from root to target block.
   */
  has(keyPath: string[]): boolean {
    return this.map.has(serializeKeyPath(keyPath))
  }

  /**
   * Convenience: get the block's index within its parent.
   * For top-level blocks with path [n], returns n.
   * For nested blocks with path [a, b, c], returns c (the last segment).
   * Accepts an array of `_key` strings from root to target block.
   */
  getIndex(keyPath: string[]): number | undefined {
    const path = this.map.get(serializeKeyPath(keyPath))
    return path?.[path.length - 1]
  }

  /**
   * Entry count.
   */
  get size(): number {
    return this.map.size
  }

  /**
   * Iteration over all entries.
   */
  entries(): IterableIterator<[string, number[]]> {
    return this.map.entries()
  }

  /**
   * Full rebuild from value array. Called once on init/reset.
   * For now, only indexes top-level blocks (same as blockIndexMap).
   * The serialized key-path for a top-level block is just its `_key`.
   */
  rebuild(value: Array<PortableTextBlock>): void {
    this.map.clear()
    for (let i = 0; i < value.length; i++) {
      const block = value[i]
      if (block !== undefined) {
        // Top-level block: serialized key-path is just the _key
        const keyPath = serializeKeyPath([block._key])
        this.map.set(keyPath, [i])
      }
    }
  }

  /**
   * Find the serialized key-path prefix for a given positional path.
   * Looks up the map to find the ancestor block key at each level.
   *
   * For a top-level path like [2], returns "" (no prefix).
   * For a nested path like [1, 0, 0], finds the key at [1] and returns it.
   */
  private findKeyPathPrefix(path: number[]): string | undefined {
    if (path.length <= 1) {
      // Top-level: no prefix needed
      return ''
    }

    // Find the parent block's serialized key-path.
    // The parent block is at the positional path truncated to the block level.
    // For path [1, 0, 0], the parent block is at [1].
    // We need to find which serialized key-path maps to a positional path
    // that is a prefix of our path.
    const parentBlockPath = [path[0]!]

    for (const [serializedKey, entryPath] of this.map) {
      if (pathEquals(entryPath, parentBlockPath)) {
        // For deeper nesting, we'd need to recurse, but for now
        // we handle the two-level case (top-level parent + nested child).
        return serializedKey
      }
    }

    return undefined
  }

  /**
   * Build the serialized key-path for a block being inserted/created
   * at the given positional path with the given key.
   */
  private buildSerializedKeyPath(path: number[], key: string): string {
    if (path.length <= 1) {
      // Top-level block: serialized key-path is just the key
      return serializeKeyPath([key])
    }

    // Nested block: find the parent's serialized key-path
    const prefix = this.findKeyPathPrefix(path)
    if (prefix === undefined) {
      // Parent not found — fall back to just the key
      return serializeKeyPath([key])
    }
    if (prefix === '') {
      return serializeKeyPath([key])
    }

    return prefix + KEY_PATH_SEPARATOR + key
  }

  /**
   * Find the serialized key-path for an entry at the given positional path.
   */
  private findKeyPathByPath(path: number[]): string | undefined {
    for (const [keyPath, entryPath] of this.map) {
      if (pathEquals(entryPath, path)) {
        return keyPath
      }
    }
    return undefined
  }

  /**
   * Apply a Slate operation to the map incrementally.
   * Only handles block-level structural operations — text edits,
   * selection changes, and sub-block operations are ignored.
   */
  applyOperation(operation: Operation): void {
    if (operation.type === 'set_selection') {
      return
    }

    // Only handle block-level operations for now.
    // When container support lands, this guard relaxes to handle deeper paths.
    if (operation.path.length !== 1) {
      return
    }

    switch (operation.type) {
      case 'insert_node': {
        const key = (operation.node as {_key?: string})._key
        if (key !== undefined) {
          this.onInsertNode(operation.path, key)
        }
        break
      }
      case 'remove_node':
        this.onRemoveNode(operation.path)
        break
      case 'split_node': {
        const key = (operation.properties as {_key?: string})._key
        if (key !== undefined) {
          this.onSplitNode(operation.path, key)
        }
        break
      }
      case 'merge_node':
        this.onMergeNode(operation.path)
        break
      case 'move_node':
        this.onMoveNode(operation.path, operation.newPath)
        break
      case 'set_node': {
        const newKey = (operation.newProperties as {_key?: string})._key
        if (newKey !== undefined) {
          const oldKey = (operation.properties as {_key?: string})._key
          if (oldKey !== undefined) {
            this.onSetNodeKey(operation.path, oldKey, newKey)
          }
        }
        break
      }
      // insert_text, remove_text: no map change needed
    }
  }

  /**
   * Handle a key change on a node at the given path.
   * For top-level blocks, this is a simple old-key → new-key rename.
   * For nested blocks (future), this would update all descendants
   * that share the old key as a prefix.
   */
  private onSetNodeKey(_path: number[], oldKey: string, newKey: string): void {
    // For top-level blocks, the serialized key-path is just the key
    const oldKeyPath = serializeKeyPath([oldKey])
    const newKeyPath = serializeKeyPath([newKey])

    const slatePath = this.map.get(oldKeyPath)
    if (slatePath === undefined) {
      return
    }

    this.map.delete(oldKeyPath)
    this.map.set(newKeyPath, slatePath)

    // For nested blocks (future): update all descendants whose serialized
    // key-path starts with the old key prefix.
    const oldPrefix = oldKeyPath + KEY_PATH_SEPARATOR
    const newPrefix = newKeyPath + KEY_PATH_SEPARATOR
    const entriesToUpdate: Array<[string, number[]]> = []

    for (const [keyPath, entryPath] of this.map) {
      if (keyPath.startsWith(oldPrefix)) {
        entriesToUpdate.push([keyPath, entryPath])
      }
    }

    for (const [keyPath, entryPath] of entriesToUpdate) {
      this.map.delete(keyPath)
      this.map.set(newPrefix + keyPath.slice(oldPrefix.length), entryPath)
    }
  }

  /**
   * Incremental: a node was inserted at `path` with the given `key`.
   * Shift siblings at/after the insertion point, then add the new entry.
   */
  onInsertNode(path: number[], key: string): void {
    const depth = path.length - 1
    const insertedIndex = path[depth]!

    // Shift existing entries at/after the insertion point
    for (const [, entryPath] of this.map) {
      if (
        sharesParentPrefix(entryPath, path, depth) &&
        entryPath[depth]! >= insertedIndex
      ) {
        entryPath[depth]!++
      }
    }

    // Build the serialized key-path and add the new entry
    const serializedKeyPath = this.buildSerializedKeyPath(path, key)
    this.map.set(serializedKeyPath, [...path])
  }

  /**
   * Incremental: a node was removed at `path`.
   * Find and remove the entry (and any descendants), then shift siblings after
   * the removal point.
   */
  onRemoveNode(path: number[]): void {
    const depth = path.length - 1
    const removedIndex = path[depth]!

    // Find keys to remove: exact match or descendants
    const keysToRemove: string[] = []
    for (const [key, entryPath] of this.map) {
      if (pathEquals(entryPath, path) || pathStartsWith(entryPath, path)) {
        keysToRemove.push(key)
      }
    }

    for (const key of keysToRemove) {
      this.map.delete(key)
    }

    // Shift siblings after the removal point
    for (const [, entryPath] of this.map) {
      if (
        sharesParentPrefix(entryPath, path, depth) &&
        entryPath[depth]! > removedIndex
      ) {
        entryPath[depth]!--
      }
    }
  }

  /**
   * Incremental: a node was split at `path`.
   * The new node (at path+1 at the same depth) gets `newKey`.
   * Shift siblings after the split point, then add the new entry.
   */
  onSplitNode(path: number[], newKey: string): void {
    const depth = path.length - 1
    const splitIndex = path[depth]!
    const newPath = [...path]
    newPath[depth] = splitIndex + 1

    // Shift existing entries after the split point
    for (const [, entryPath] of this.map) {
      if (
        sharesParentPrefix(entryPath, path, depth) &&
        entryPath[depth]! > splitIndex
      ) {
        entryPath[depth]!++
      }
    }

    // Build the serialized key-path and add the new entry at path+1
    const serializedKeyPath = this.buildSerializedKeyPath(newPath, newKey)
    this.map.set(serializedKeyPath, newPath)
  }

  /**
   * Incremental: a node was merged at `path`.
   * Merge removes the node at `path` (its content is merged into the previous
   * sibling). Delegates to onRemoveNode.
   */
  onMergeNode(path: number[]): void {
    this.onRemoveNode(path)
  }

  /**
   * Derive a Map<string, number> for backward compatibility.
   * Returns a map of key → top-level block index.
   * Extracts the last key segment from the serialized path.
   */
  toBlockIndexMap(): Map<string, number> {
    const result = new Map<string, number>()
    for (const [keyPath, path] of this.map) {
      if (path.length === 1) {
        // Extract the last key segment from the serialized path
        const segments = keyPath.split(KEY_PATH_SEPARATOR)
        const lastKey = segments[segments.length - 1]!
        result.set(lastKey, path[0]!)
      }
    }
    return result
  }

  /**
   * Incremental: a node was moved from `fromPath` to `toPath`.
   * Decomposed into remove + insert. The remove shifts indices first,
   * so the insert sees the post-removal state — this correctly handles
   * all cases including adjacent swaps.
   */
  onMoveNode(fromPath: number[], toPath: number[]): void {
    // Find the serialized key-path at fromPath
    const movedKeyPath = this.findKeyPathByPath(fromPath)

    if (movedKeyPath === undefined) {
      return
    }

    // Extract the bare key (last segment) for re-insertion
    const segments = movedKeyPath.split(KEY_PATH_SEPARATOR)
    const bareKey = segments[segments.length - 1]!

    // Remove from old position (shifts siblings)
    this.onRemoveNode(fromPath)

    // Insert at new position (shifts siblings and adds entry)
    this.onInsertNode(toPath, bareKey)
  }
}
