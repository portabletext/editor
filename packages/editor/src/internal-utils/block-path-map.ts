import type {PortableTextBlock} from '@portabletext/schema'
import type {Operation} from '../slate'

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
 * Maps block keys to their Slate paths (number[]).
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
   * O(1) lookup by key.
   */
  get(key: string): number[] | undefined {
    return this.map.get(key)
  }

  /**
   * Existence check.
   */
  has(key: string): boolean {
    return this.map.has(key)
  }

  /**
   * Convenience: get the block's index within its parent.
   * For top-level blocks with path [n], returns n.
   * For nested blocks with path [a, b, c], returns c (the last segment).
   */
  getIndex(key: string): number | undefined {
    const path = this.map.get(key)
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
   */
  rebuild(value: Array<PortableTextBlock>): void {
    this.map.clear()
    for (let i = 0; i < value.length; i++) {
      const block = value[i]
      if (block !== undefined) {
        this.map.set(block._key, [i])
      }
    }
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
      // insert_text, remove_text, set_node: no map change needed
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

    // Add the new entry
    this.map.set(key, [...path])
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

    // Add the new entry at path+1
    this.map.set(newKey, newPath)
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
   */
  toBlockIndexMap(): Map<string, number> {
    const result = new Map<string, number>()
    for (const [key, path] of this.map) {
      if (path.length === 1) {
        result.set(key, path[0]!)
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
    // Find the key at fromPath
    let movedKey: string | undefined
    for (const [key, entryPath] of this.map) {
      if (pathEquals(entryPath, fromPath)) {
        movedKey = key
        break
      }
    }

    if (movedKey === undefined) {
      return
    }

    // Remove from old position (shifts siblings)
    this.onRemoveNode(fromPath)

    // Insert at new position (shifts siblings and adds entry)
    this.onInsertNode(toPath, movedKey)
  }
}
