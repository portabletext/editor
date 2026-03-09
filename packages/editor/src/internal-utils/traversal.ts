import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {KeyedSegment, Path, PathSegment} from '../types/paths'
import {resolveArrayFields} from './resolve-container-fields'

/**
 * Result of a traversal operation: the node and its path.
 */
export type TraversalResult = {node: PortableTextBlock; path: Path}

/**
 * Internal result from resolving a node by path, including sibling context.
 */
interface ResolvedNode {
  node: PortableTextBlock
  siblings: Array<PortableTextBlock>
  indexInSiblings: number
}

/**
 * Check if a path segment is a keyed segment.
 */
function isKeyedSegment(segment: PathSegment): segment is KeyedSegment {
  return (
    typeof segment === 'object' &&
    segment !== null &&
    '_key' in segment &&
    !Array.isArray(segment)
  )
}

/**
 * Extract `_key` values from KeyedSegment segments in a Path.
 * Used to build the key-path for BlockPathMap lookups.
 */
function extractKeys(path: Path): string[] {
  const keys: string[] = []
  for (const segment of path) {
    if (isKeyedSegment(segment)) {
      keys.push(segment._key)
    }
  }
  return keys
}

/**
 * Extract field name segments (strings) from a Path.
 * These are the named array fields between keyed segments.
 * For path [{_key: 'table-1'}, 'rows', {_key: 'row-1'}],
 * returns ['rows'].
 */
function extractFieldNames(path: Path): string[] {
  const fields: string[] = []
  for (const segment of path) {
    if (typeof segment === 'string') {
      fields.push(segment)
    }
  }
  return fields
}

/**
 * Walk the value tree using field names and positional indices.
 *
 * The positional path has one index per keyed segment:
 * - posPath[0] is the index of the first keyed block in `value`
 * - posPath[1] is the index of the second keyed block in its parent's array field
 * - etc.
 *
 * The field names tell us which named array field to descend into at each level.
 * fieldNames[0] is the field name on the block at posPath[0] that contains the block at posPath[1].
 *
 * Returns the resolved node info including siblings and index.
 */
function walkValueTree(
  value: Array<PortableTextBlock>,
  fieldNames: string[],
  posPath: number[],
): ResolvedNode | undefined {
  if (posPath.length === 0) {
    return undefined
  }

  let siblings: Array<PortableTextBlock> = value
  let node: PortableTextBlock | undefined
  let indexInSiblings = -1

  for (let i = 0; i < posPath.length; i++) {
    const idx = posPath[i]
    if (idx === undefined) {
      return undefined
    }

    node = siblings[idx]
    if (!node) {
      return undefined
    }
    indexInSiblings = idx

    // If there's a next level, descend into the named field
    if (i < posPath.length - 1) {
      const fieldName = fieldNames[i]
      if (!fieldName) {
        return undefined
      }
      const field = (node as Record<string, unknown>)[fieldName]
      if (!Array.isArray(field)) {
        return undefined
      }
      siblings = field as Array<PortableTextBlock>
    }
  }

  if (!node) {
    return undefined
  }

  return {node, siblings, indexInSiblings}
}

/**
 * Resolve a node by walking the value tree following the path segments.
 *
 * Uses the BlockPathMap for O(1) position resolution when available,
 * then walks the tree using positional indices - O(depth) with O(1) per step.
 *
 * Falls back to linear scan when the map doesn't have the entry
 * (e.g., during transitions or for paths not yet indexed).
 */
function resolveNode(
  snapshot: EditorSnapshot,
  path: Path,
): ResolvedNode | undefined {
  if (path.length === 0) {
    return undefined
  }

  const value = snapshot.context.value
  const keys = extractKeys(path)

  if (keys.length === 0) {
    return undefined
  }

  // Try O(1) map lookup
  const posPath = snapshot.blockPathMap.get(keys)

  if (posPath) {
    const fieldNames = extractFieldNames(path)
    return walkValueTree(value, fieldNames, posPath)
  }

  // Fallback: walk the tree using findIndex (for entries not in the map)
  return resolveNodeByWalk(value, path)
}

/**
 * Fallback: resolve a node by walking the value tree with findIndex scans.
 * Used when the BlockPathMap doesn't have the entry.
 */
function resolveNodeByWalk(
  value: Array<PortableTextBlock>,
  path: Path,
): ResolvedNode | undefined {
  if (path.length === 0) {
    return undefined
  }

  let siblings: Array<PortableTextBlock> = value
  let node: PortableTextBlock | undefined
  let indexInSiblings = -1

  for (let i = 0; i < path.length; i++) {
    const segment = path[i]

    if (segment === undefined) {
      return undefined
    }

    if (typeof segment === 'string') {
      // Field name segment - access the named array field on the current node
      if (!node) {
        return undefined
      }
      const field = (node as Record<string, unknown>)[segment]
      if (!Array.isArray(field)) {
        return undefined
      }
      siblings = field as Array<PortableTextBlock>
      continue
    }

    // KeyedSegment - find the block with this _key in current siblings
    if (!isKeyedSegment(segment)) {
      return undefined
    }
    const key = segment._key
    const idx = siblings.findIndex((b) => b._key === key)
    if (idx === -1) {
      return undefined
    }
    indexInSiblings = idx
    node = siblings[idx]
  }

  if (!node) {
    return undefined
  }

  return {node, siblings, indexInSiblings}
}

/**
 * Check if a block is a text block.
 */
function isTextBlock(
  snapshot: EditorSnapshot,
  block: PortableTextBlock,
): boolean {
  return block._type === snapshot.context.schema.block.name
}

/**
 * Check if a block is a block object (void).
 */
function isBlockObject(
  snapshot: EditorSnapshot,
  block: PortableTextBlock,
): boolean {
  return snapshot.context.schema.blockObjects.some(
    (bo) => bo.name === block._type,
  )
}

/**
 * Check if a block is a container (a block object in the containers set).
 */
function isContainer(
  snapshot: EditorSnapshot,
  block: PortableTextBlock,
): boolean {
  return snapshot.context.containers.has(block._type)
}

/**
 * Check if a block is a leaf (text block or non-container block object)
 * where a cursor can rest.
 * Containers are NOT leaf blocks - they contain other blocks.
 */
function isLeafBlock(
  snapshot: EditorSnapshot,
  block: PortableTextBlock,
): boolean {
  if (isTextBlock(snapshot, block)) {
    return true
  }
  if (isBlockObject(snapshot, block) && !isContainer(snapshot, block)) {
    return true
  }
  return false
}

/**
 * Get the array field names for a container type.
 * Uses snapshot.context.containers to check if the type is a container,
 * then resolves fields from schema.blockObjects and their nested of definitions.
 */
function getContainerArrayFields(
  snapshot: EditorSnapshot,
  typeName: string,
): string[] {
  if (!snapshot.context.containers.has(typeName)) {
    return []
  }
  return resolveArrayFields(snapshot.context.schema, typeName)
}

/**
 * Find all direct block children of a node by scanning its array fields.
 *
 * Uses schema-driven container field discovery when the node's type is
 * registered as a container. Falls back to duck-typing (Object.entries
 * scanning) for unregistered types.
 */
function findBlockChildren(
  snapshot: EditorSnapshot,
  node: PortableTextBlock,
  parentPath: Path,
): Array<{node: PortableTextBlock; path: Path; fieldName: string}> {
  const results: Array<{
    node: PortableTextBlock
    path: Path
    fieldName: string
  }> = []

  const arrayFields = getContainerArrayFields(snapshot, node._type)

  if (arrayFields.length > 0) {
    // Schema-driven: iterate fields in schema-defined order
    for (const fieldName of arrayFields) {
      const value = (node as Record<string, unknown>)[fieldName]
      if (!Array.isArray(value)) {
        continue
      }
      for (const item of value) {
        if (
          item &&
          typeof item === 'object' &&
          '_key' in item &&
          '_type' in item
        ) {
          results.push({
            node: item as PortableTextBlock,
            path: [
              ...parentPath,
              fieldName,
              {_key: String((item as Record<string, unknown>)['_key'])},
            ],
            fieldName,
          })
        }
      }
    }
  } else {
    // Fallback: duck-typing for unregistered container types
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('_')) {
        continue
      }
      if (key === 'children' || key === 'markDefs') {
        continue
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (
            item &&
            typeof item === 'object' &&
            '_key' in item &&
            '_type' in item
          ) {
            results.push({
              node: item as PortableTextBlock,
              path: [
                ...parentPath,
                key,
                {_key: String((item as Record<string, unknown>)['_key'])},
              ],
              fieldName: key,
            })
          }
        }
      }
    }
  }

  return results
}

/**
 * Get the first leaf block (depth-first) within a node.
 * Useful for explicitly entering a container.
 */
export function getFirstLeaf(
  snapshot: EditorSnapshot,
  node: PortableTextBlock,
  path: Path,
): TraversalResult | undefined {
  if (isLeafBlock(snapshot, node)) {
    return {node, path}
  }
  const children = findBlockChildren(snapshot, node, path)
  for (const child of children) {
    const leaf = getFirstLeaf(snapshot, child.node, child.path)
    if (leaf) {
      return leaf
    }
  }
  return undefined
}

/**
 * Get the last leaf block (depth-first) within a node.
 * Useful for explicitly entering a container from the end.
 */
export function getLastLeaf(
  snapshot: EditorSnapshot,
  node: PortableTextBlock,
  path: Path,
): TraversalResult | undefined {
  if (isLeafBlock(snapshot, node)) {
    return {node, path}
  }
  const children = findBlockChildren(snapshot, node, path)
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i]
    if (child) {
      const leaf = getLastLeaf(snapshot, child.node, child.path)
      if (leaf) {
        return leaf
      }
    }
  }
  return undefined
}

/**
 * Build the path to a sibling by replacing the last keyed segment.
 */
function siblingPath(path: Path, siblingKey: string): Path {
  const result = [...path]
  result[result.length - 1] = {_key: siblingKey}
  return result
}

/**
 * Get a node by its path.
 */
export function getNode(
  snapshot: EditorSnapshot,
  path: Path,
): TraversalResult | undefined {
  const resolved = resolveNode(snapshot, path)

  if (!resolved) {
    return undefined
  }

  return {node: resolved.node, path}
}

/**
 * Get the parent of a node.
 * Strips the last keyed segment (and preceding string field name if present).
 * Returns undefined for top-level blocks.
 */
export function getParent(
  snapshot: EditorSnapshot,
  path: Path,
): TraversalResult | undefined {
  // Count keyed segments - if only one, it's top-level
  const keyedCount = path.filter(isKeyedSegment).length
  if (keyedCount <= 1) {
    return undefined
  }

  // Strip the last keyed segment and the preceding string field name
  let parentPath = [...path]

  // Remove last segment (should be a keyed segment)
  const lastSegment = parentPath[parentPath.length - 1]
  if (lastSegment && isKeyedSegment(lastSegment)) {
    parentPath = parentPath.slice(0, -1)
  }

  // Remove the field name string segment before it
  const prevSegment = parentPath[parentPath.length - 1]
  if (prevSegment && typeof prevSegment === 'string') {
    parentPath = parentPath.slice(0, -1)
  }

  if (parentPath.length === 0) {
    return undefined
  }

  return getNode(snapshot, parentPath)
}

/**
 * Get all direct children of a node.
 * For text blocks and block objects, returns empty (they have no block children).
 * For containers, returns their direct block children.
 */
export function getChildren(
  snapshot: EditorSnapshot,
  path: Path,
): Array<TraversalResult> {
  const result = getNode(snapshot, path)

  if (!result) {
    return []
  }

  if (isLeafBlock(snapshot, result.node)) {
    return []
  }

  return findBlockChildren(snapshot, result.node, path).map((child) => ({
    node: child.node,
    path: child.path,
  }))
}

/**
 * Get the next sibling at the same level.
 */
export function getNextSibling(
  snapshot: EditorSnapshot,
  path: Path,
): TraversalResult | undefined {
  const resolved = resolveNode(snapshot, path)

  if (!resolved) {
    return undefined
  }

  const nextBlock = resolved.siblings[resolved.indexInSiblings + 1]

  if (!nextBlock) {
    return undefined
  }

  return {node: nextBlock, path: siblingPath(path, nextBlock._key)}
}

/**
 * Get the previous sibling at the same level.
 */
export function getPrevSibling(
  snapshot: EditorSnapshot,
  path: Path,
): TraversalResult | undefined {
  const resolved = resolveNode(snapshot, path)

  if (!resolved || resolved.indexInSiblings <= 0) {
    return undefined
  }

  const prevBlock = resolved.siblings[resolved.indexInSiblings - 1]

  if (!prevBlock) {
    return undefined
  }

  return {node: prevBlock, path: siblingPath(path, prevBlock._key)}
}

/**
 * Get all ancestors from root to the node's parent.
 * Returns ancestors in order from outermost to innermost.
 */
export function getAncestors(
  snapshot: EditorSnapshot,
  path: Path,
): Array<TraversalResult> {
  const ancestors: Array<TraversalResult> = []

  // Build ancestor paths by collecting keyed segment prefixes
  let currentPath: Path = []

  for (let i = 0; i < path.length; i++) {
    const segment = path[i]
    if (segment === undefined) {
      break
    }

    currentPath = [...currentPath, segment]

    if (isKeyedSegment(segment)) {
      // Don't include the node itself - only ancestors
      const isLast =
        i === path.length - 1 ||
        // Check if this is the last keyed segment
        !path.slice(i + 1).some(isKeyedSegment)

      if (!isLast) {
        const resolved = resolveNode(snapshot, currentPath)
        if (resolved) {
          ancestors.push({node: resolved.node, path: [...currentPath]})
        }
      }
    }
  }

  return ancestors
}

/**
 * Get the next block in document order.
 *
 * Containers are treated as opaque cursor stops - they are returned as-is,
 * never auto-descended into. Use getFirstLeaf/getLastLeaf to explicitly
 * enter a container.
 *
 * When called on a container, returns the next sibling (or walks up).
 * When called on a leaf, returns the next sibling (or walks up).
 * Walking up skips own ancestors and returns the first non-ancestor block found.
 */
export function getNextBlock(
  snapshot: EditorSnapshot,
  path: Path,
): TraversalResult | undefined {
  const resolved = resolveNode(snapshot, path)

  if (!resolved) {
    return undefined
  }

  // Try next sibling and walk up if needed
  return getNextBlockFromPosition(snapshot, path)
}

/**
 * Walk forward from a position: try next sibling, then walk up to parent's
 * next sibling. Containers are returned as cursor stops, never descended into.
 */
function getNextBlockFromPosition(
  snapshot: EditorSnapshot,
  path: Path,
): TraversalResult | undefined {
  const resolved = resolveNode(snapshot, path)

  if (!resolved) {
    return undefined
  }

  // Try the immediate next sibling
  const nextBlock = resolved.siblings[resolved.indexInSiblings + 1]

  if (nextBlock) {
    return {node: nextBlock, path: siblingPath(path, nextBlock._key)}
  }

  // No more siblings - walk up to parent's next sibling
  const parent = getParent(snapshot, path)
  if (parent) {
    return getNextBlockFromPosition(snapshot, parent.path)
  }

  return undefined
}

/**
 * Get the previous block in document order.
 *
 * Containers are treated as opaque cursor stops - they are returned as-is,
 * never auto-descended into. Use getFirstLeaf/getLastLeaf to explicitly
 * enter a container.
 *
 * Walking up skips own ancestors and returns the first non-ancestor block found.
 */
export function getPrevBlock(
  snapshot: EditorSnapshot,
  path: Path,
): TraversalResult | undefined {
  const resolved = resolveNode(snapshot, path)

  if (!resolved) {
    return undefined
  }

  // Try previous sibling and walk up if needed
  return getPrevBlockFromPosition(snapshot, path)
}

/**
 * Walk backward from a position: try prev sibling, then walk up to parent's
 * prev sibling. Containers are returned as cursor stops, never descended into.
 */
function getPrevBlockFromPosition(
  snapshot: EditorSnapshot,
  path: Path,
): TraversalResult | undefined {
  const resolved = resolveNode(snapshot, path)

  if (!resolved) {
    return undefined
  }

  // Try the immediate previous sibling
  if (resolved.indexInSiblings > 0) {
    const prevBlock = resolved.siblings[resolved.indexInSiblings - 1]
    if (prevBlock) {
      return {node: prevBlock, path: siblingPath(path, prevBlock._key)}
    }
  }

  // No previous siblings - walk up to parent's previous sibling
  const parent = getParent(snapshot, path)
  if (parent) {
    return getPrevBlockFromPosition(snapshot, parent.path)
  }

  return undefined
}

/**
 * Is this block inside a container?
 * True when the path has more than one keyed segment.
 */
export function isNested(_snapshot: EditorSnapshot, path: Path): boolean {
  return path.filter(isKeyedSegment).length > 1
}

/**
 * How deep is this block? (0 = top-level)
 * Depth is the number of keyed segments minus 1.
 */
export function getDepth(_snapshot: EditorSnapshot, path: Path): number {
  return path.filter(isKeyedSegment).length - 1
}

/**
 * Is one block a descendant of another?
 * Checks if ancestorPath is a prefix of path.
 */
export function isDescendantOf(
  _snapshot: EditorSnapshot,
  path: Path,
  ancestorPath: Path,
): boolean {
  if (path.length <= ancestorPath.length) {
    return false
  }

  for (let i = 0; i < ancestorPath.length; i++) {
    const pathSegment = path[i]
    const ancestorSegment = ancestorPath[i]

    if (pathSegment === undefined || ancestorSegment === undefined) {
      return false
    }

    if (
      typeof pathSegment === 'string' &&
      typeof ancestorSegment === 'string'
    ) {
      if (pathSegment !== ancestorSegment) {
        return false
      }
    } else if (isKeyedSegment(pathSegment) && isKeyedSegment(ancestorSegment)) {
      if (pathSegment._key !== ancestorSegment._key) {
        return false
      }
    } else {
      return false
    }
  }

  return true
}

/**
 * Get the nearest ancestor that's a container.
 * Walks up the ancestors and returns the first that is not a leaf block.
 */
export function getContainingContainer(
  snapshot: EditorSnapshot,
  path: Path,
): TraversalResult | undefined {
  const ancestors = getAncestors(snapshot, path)

  // Walk from innermost to outermost
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i]
    if (ancestor && !isLeafBlock(snapshot, ancestor.node)) {
      return ancestor
    }
  }

  return undefined
}
