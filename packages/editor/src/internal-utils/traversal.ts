import type {PortableTextBlock} from '@portabletext/schema'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {KeyedSegment, Path, PathSegment} from '../types/paths'

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
 * Resolve a node by walking the value tree following the path segments.
 */
function resolveNode(
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
 * Check if a block is a leaf (text block or block object) where a cursor can rest.
 */
function isLeafBlock(
  snapshot: EditorSnapshot,
  block: PortableTextBlock,
): boolean {
  return isTextBlock(snapshot, block) || isBlockObject(snapshot, block)
}

/**
 * Find all direct block children of a node by scanning its array fields.
 * Skips internal fields (_type, _key, etc.), children, and markDefs.
 */
function findBlockChildren(
  node: PortableTextBlock,
  parentPath: Path,
): Array<{node: PortableTextBlock; path: Path; fieldName: string}> {
  const results: Array<{
    node: PortableTextBlock
    path: Path
    fieldName: string
  }> = []

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

  return results
}

/**
 * Get the first leaf block (depth-first) within a node.
 */
function getFirstLeaf(
  snapshot: EditorSnapshot,
  node: PortableTextBlock,
  path: Path,
): TraversalResult | undefined {
  if (isLeafBlock(snapshot, node)) {
    return {node, path}
  }
  const children = findBlockChildren(node, path)
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
 */
function getLastLeaf(
  snapshot: EditorSnapshot,
  node: PortableTextBlock,
  path: Path,
): TraversalResult | undefined {
  if (isLeafBlock(snapshot, node)) {
    return {node, path}
  }
  const children = findBlockChildren(node, path)
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
  const resolved = resolveNode(snapshot.context.value, path)

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

  return findBlockChildren(result.node, path).map((child) => ({
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
  const resolved = resolveNode(snapshot.context.value, path)

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
  const resolved = resolveNode(snapshot.context.value, path)

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
        const resolved = resolveNode(snapshot.context.value, currentPath)
        if (resolved) {
          ancestors.push({node: resolved.node, path: [...currentPath]})
        }
      }
    }
  }

  return ancestors
}

/**
 * Get the next block in document order (depth-first pre-order).
 * Skips container nodes, returns only leaf blocks (text blocks and block objects).
 */
export function getNextBlock(
  snapshot: EditorSnapshot,
  path: Path,
): TraversalResult | undefined {
  const resolved = resolveNode(snapshot.context.value, path)

  if (!resolved) {
    return undefined
  }

  // If current is a container, descend into its first leaf
  if (!isLeafBlock(snapshot, resolved.node)) {
    const firstLeaf = getFirstLeaf(snapshot, resolved.node, path)
    if (firstLeaf) {
      return firstLeaf
    }
  }

  // Try next sibling and walk up if needed
  return getNextBlockFromPosition(snapshot, path)
}

/**
 * Walk forward from a position: try next sibling, then walk up to parent's next sibling.
 */
function getNextBlockFromPosition(
  snapshot: EditorSnapshot,
  path: Path,
): TraversalResult | undefined {
  const resolved = resolveNode(snapshot.context.value, path)

  if (!resolved) {
    return undefined
  }

  // Try siblings after current
  for (
    let i = resolved.indexInSiblings + 1;
    i < resolved.siblings.length;
    i++
  ) {
    const sibling = resolved.siblings[i]
    if (!sibling) {
      continue
    }
    const sibPath = siblingPath(path, sibling._key)

    if (isLeafBlock(snapshot, sibling)) {
      return {node: sibling, path: sibPath}
    }

    // Container - descend into first leaf
    const firstLeaf = getFirstLeaf(snapshot, sibling, sibPath)
    if (firstLeaf) {
      return firstLeaf
    }
  }

  // No more siblings - walk up to parent
  const parent = getParent(snapshot, path)
  if (parent) {
    return getNextBlockFromPosition(snapshot, parent.path)
  }

  return undefined
}

/**
 * Get the previous block in document order (depth-first pre-order).
 * Skips container nodes, returns only leaf blocks (text blocks and block objects).
 */
export function getPrevBlock(
  snapshot: EditorSnapshot,
  path: Path,
): TraversalResult | undefined {
  const resolved = resolveNode(snapshot.context.value, path)

  if (!resolved) {
    return undefined
  }

  // Try previous sibling and walk up if needed
  return getPrevBlockFromPosition(snapshot, path)
}

/**
 * Walk backward from a position: try prev sibling's last leaf, then walk up to parent.
 */
function getPrevBlockFromPosition(
  snapshot: EditorSnapshot,
  path: Path,
): TraversalResult | undefined {
  const resolved = resolveNode(snapshot.context.value, path)

  if (!resolved) {
    return undefined
  }

  // Try siblings before current (in reverse)
  for (let i = resolved.indexInSiblings - 1; i >= 0; i--) {
    const sibling = resolved.siblings[i]
    if (!sibling) {
      continue
    }
    const sibPath = siblingPath(path, sibling._key)

    if (isLeafBlock(snapshot, sibling)) {
      return {node: sibling, path: sibPath}
    }

    // Container - descend into last leaf
    const lastLeaf = getLastLeaf(snapshot, sibling, sibPath)
    if (lastLeaf) {
      return lastLeaf
    }
  }

  // No more siblings - walk up to parent
  const parent = getParent(snapshot, path)
  if (parent) {
    // If parent is a container (not a leaf), try parent's prev sibling
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
