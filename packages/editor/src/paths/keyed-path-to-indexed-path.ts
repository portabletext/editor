import type {Node} from '../slate/interfaces/node'
import type {Path} from '../types/paths'
import {isKeyedSegment} from '../utils/util.is-keyed-segment'

/**
 * Converts a keyed path to an indexed path.
 *
 * Uses `blockIndexMap` for O(1) lookup of the first segment, then walks the
 * tree for deeper segments using string segments as property names.
 *
 * - `[{_key: 'imageKey'}]` -> `[0]`
 * - `[{_key: 'blockKey'}, 'children', {_key: 'spanKey'}]` -> `[0, 0]`
 * - `[{_key: 'tableKey'}, 'rows', {_key: 'rowKey'}, 'cells', {_key: 'cellKey'}, 'content', {_key: 'blockKey'}, 'children', {_key: 'spanKey'}]` -> `[0, 0, 0, 0, 0]`
 */
export function keyedPathToIndexedPath(
  root: {children: Array<Node>},
  keyedPath: Path,
  blockIndexMap: Map<string, number>,
): Array<number> | undefined {
  if (keyedPath.length === 0) {
    return []
  }

  const firstSegment = keyedPath[0]

  if (!firstSegment || !isKeyedSegment(firstSegment)) {
    return undefined
  }

  const blockIndex = blockIndexMap.get(firstSegment._key)

  if (blockIndex === undefined) {
    return undefined
  }

  const block = root.children[blockIndex]

  if (!block) {
    return undefined
  }

  const childPath = resolveChildPath(block, keyedPath.slice(1))

  if (!childPath) {
    return undefined
  }

  return [blockIndex, ...childPath]
}

function resolveChildPath(
  node: Node,
  keyedPath: Path,
): Array<number> | undefined {
  const segment = keyedPath[0]

  if (!segment) {
    return []
  }

  if (isKeyedSegment(segment)) {
    const children = (node as {children?: Array<Node>}).children

    if (!children) {
      return undefined
    }

    let childIndex = 0

    for (const child of children) {
      if (child._key === segment._key) {
        const rest = resolveChildPath(child, keyedPath.slice(1))

        if (!rest) {
          return undefined
        }

        return [childIndex, ...rest]
      }

      childIndex++
    }

    return undefined
  }

  if (typeof segment !== 'string') {
    return undefined
  }

  if (!(segment in node)) {
    return undefined
  }

  const childrenField = (node as Record<string, unknown>)[segment]

  if (Array.isArray(childrenField)) {
    return resolveChildPath(
      {children: childrenField} as unknown as Node,
      keyedPath.slice(1),
    )
  }

  return undefined
}
