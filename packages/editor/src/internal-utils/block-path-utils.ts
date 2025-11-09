import {isContainerBlock} from '@portabletext/schema'
import type {PortableTextBlock} from '@sanity/types'
import type {EditorContext} from '../editor/editor-snapshot'

/**
 * Gets a block or child from a value array using a block path.
 * For top-level blocks, path is [index].
 * For nested children, path is [blockIndex, childIndex, ...].
 */
export function getBlockByPath(
  context: Pick<EditorContext, 'schema' | 'value'>,
  path: Array<number>,
): PortableTextBlock | undefined {
  if (path.length === 0) {
    return undefined
  }

  // Get the top-level block
  let current: any = context.value.at(path[0])

  if (!current) {
    return undefined
  }

  // If path has more than one segment, traverse into children
  for (let i = 1; i < path.length; i++) {
    if (!isContainerBlock(context, current) || !current.children) {
      return undefined
    }
    current = current.children.at(path[i])
    if (!current) {
      return undefined
    }
  }

  return current
}

/**
 * Gets the top-level block index from a block path.
 * This is useful when you need to access the top-level value array.
 */
export function getTopLevelIndex(path: Array<number>): number | undefined {
  return path.length > 0 ? path[0] : undefined
}

/**
 * Checks if a block path represents a top-level block (not nested).
 */
export function isTopLevelPath(path: Array<number>): boolean {
  return path.length === 1
}

/**
 * Converts a block path to a Slate path.
 * For now, this is just the path itself, but keeping this function
 * for future compatibility if the mapping becomes more complex.
 */
export function blockPathToSlatePath(path: Array<number>): Array<number> {
  return [...path]
}
