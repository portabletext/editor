import type {EditorSchema} from '../editor/editor-schema'
import {getNode} from '../node-traversal/get-node'
import {keyedPathToIndexedPath} from '../paths/keyed-path-to-indexed-path'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Splits a patch path into a tree node path and a trailing property path.
 *
 * The structural segments alternate: key, field name, key, field name, key.
 * Everything after the last keyed segment that resolves to a real tree node
 * is the property path.
 *
 * For `[{_key:'b1'}, 'children', {_key:'s1'}, 'text']`:
 * - indexedPath: `[0, 0]`
 * - propertyPath: `['text']`
 *
 * For `[{_key:'b1'}, 'markDefs', {_key:'m1'}, 'href']`:
 * - indexedPath: `[0]` (markDefs is not a structural field)
 * - propertyPath: `['markDefs', {_key:'m1'}, 'href']`
 *
 * Tries progressively shorter keyed prefixes, verifying each resolution
 * by checking the resolved node's `_key` matches the expected key.
 * Uses `getNode` from the traversal layer for verification, which is
 * schema-aware and won't be confused by non-structural arrays like markDefs.
 */
export function resolveNodePath(
  context: {
    schema: EditorSchema
    editableTypes: Set<string>
    children: Array<Node>
    value: Array<Node>
    blockIndexMap: Map<string, number>
  },
  patchPath: Path,
): {indexedPath: Array<number>; propertyPath: Path} | undefined {
  // Collect all keyed segment indices
  const keyedIndices: Array<number> = []
  for (let index = 0; index < patchPath.length; index++) {
    if (isKeyedSegment(patchPath.at(index))) {
      keyedIndices.push(index)
    }
  }

  if (keyedIndices.length === 0) {
    // Handle numeric first segment (e.g., [0] for inserting into empty editor)
    const firstSegment = patchPath.at(0)
    if (typeof firstSegment === 'number') {
      const node = context.children.at(firstSegment)
      if (node) {
        return {indexedPath: [firstSegment], propertyPath: patchPath.slice(1)}
      }
    }
    return undefined
  }

  // Try from the longest keyed prefix to the shortest
  for (let attempt = keyedIndices.length - 1; attempt >= 0; attempt--) {
    const lastKeyedIndex = keyedIndices.at(attempt)!
    const treePath = patchPath.slice(0, lastKeyedIndex + 1)
    const propertyPath = patchPath.slice(lastKeyedIndex + 1)

    const indexedPath = keyedPathToIndexedPath(
      context,
      treePath,
      context.blockIndexMap,
    )

    if (!indexedPath) {
      continue
    }

    // Verify the resolved node has the expected _key using the schema-aware
    // traversal. This catches false positives from non-structural arrays
    // like markDefs that keyedPathToIndexedPath follows blindly.
    const lastKeyedSegment = patchPath.at(lastKeyedIndex)
    if (!isKeyedSegment(lastKeyedSegment)) {
      continue
    }

    const resolvedEntry = getNode(context, indexedPath)
    if (!resolvedEntry || resolvedEntry.node._key !== lastKeyedSegment._key) {
      continue
    }

    return {indexedPath, propertyPath}
  }

  return undefined
}
