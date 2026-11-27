// Keep in sync with `packages/editor/src/internal-utils/build-index-maps.ts`.
import type {Path} from '@portabletext/patches'
import type {KeyedSegment} from '@portabletext/patches'
import type {RegisteredContainer} from './container-types'
import {getNodeChildren} from './get-children'
import type {Node} from './node'
import {serializePath} from './serialize-path'
import type {TraversalSnapshot} from './traversal-snapshot'

/**
 * Mutates `indexMap` in place. Used for initial engine population and
 * tests. During operation application the map is maintained incrementally
 * by `transform-block-index-map` helpers.
 */
export function buildIndexMaps(
  context: TraversalSnapshot['context'],
  {
    indexMap,
  }: {
    indexMap: Map<string, number>
  },
): void {
  indexMap.clear()
  for (let blockIndex = 0; blockIndex < context.value.length; blockIndex++) {
    const block = context.value.at(blockIndex)
    if (block == null || block._key === undefined) {
      // Unkeyed transient blocks (e.g. inserted by a remote patch before
      // normalization assigns a `_key`) cannot be addressed by keyed path,
      // so they are not indexed, mirroring `collectDescendantIndexes`.
      continue
    }
    const blockSegment: KeyedSegment = {_key: block._key}
    const blockPath: Path = [blockSegment]
    const blockKey = serializePath(blockPath)
    if (!indexMap.has(blockKey)) {
      indexMap.set(blockKey, blockIndex)
    }
    collectDescendantIndexes(context, block, blockPath, undefined, indexMap)
  }
}

function collectDescendantIndexes(
  context: Pick<TraversalSnapshot['context'], 'schema' | 'containers'>,
  node: Node,
  nodePath: Path,
  parent: RegisteredContainer | undefined,
  indexMap: Map<string, number>,
): void {
  const result = getNodeChildren(context, node, parent)
  if (!result) {
    return
  }

  for (let i = 0; i < result.children.length; i++) {
    const child = result.children[i]!
    if (!child?._key) {
      continue
    }

    const childSegment: KeyedSegment = {_key: child._key}
    const childPath: Path = [...nodePath, result.fieldName, childSegment]
    const childKey = serializePath(childPath)
    if (!indexMap.has(childKey)) {
      indexMap.set(childKey, i)
    }

    collectDescendantIndexes(context, child, childPath, result.parent, indexMap)
  }
}
