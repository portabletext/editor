import type {AnnotationPath, BlockPath, ChildPath} from '../types/paths'
import {isKeyedSegment} from './util.is-keyed-segment'

/**
 * Get the block key from a BlockPath (last keyed segment).
 * For top-level blocks: `[{_key: 'abc'}]` → `'abc'`
 * For nested blocks: `[{_key: 'container'}, 'rows', 0, {_key: 'child'}]` → `'child'`
 *
 * Returns undefined if the path is empty or the last segment isn't keyed.
 */
export function getBlockKeyFromPath(path: BlockPath): string | undefined {
  const lastSegment = path[path.length - 1]
  if (isKeyedSegment(lastSegment)) {
    return lastSegment._key
  }
  return undefined
}

/**
 * Get the child key from a ChildPath (last segment after 'children').
 */
export function getChildKeyFromChildPath(path: ChildPath): string {
  return (path[path.length - 1] as {_key: string})._key
}

/**
 * Get the child key from a generic Path by finding the segment after 'children'.
 * Returns undefined if the path doesn't contain a child segment.
 */
export function getChildKeyFromPath(
  path: ReadonlyArray<unknown>,
): string | undefined {
  const childrenIndex = path.indexOf('children')
  if (childrenIndex === -1) return undefined
  const childSegment = path[childrenIndex + 1]
  if (isKeyedSegment(childSegment)) {
    return childSegment._key
  }
  return undefined
}

/**
 * Get the annotation key from an AnnotationPath (last segment after 'markDefs').
 */
export function getAnnotationKeyFromPath(path: AnnotationPath): string {
  return (path[path.length - 1] as {_key: string})._key
}

/**
 * Extract the BlockPath portion from a ChildPath or AnnotationPath.
 * Returns everything before 'children' or 'markDefs'.
 */
export function getBlockPathFromChildPath(path: ChildPath): BlockPath {
  const childrenIndex = path.indexOf('children')
  return path.slice(0, childrenIndex) as BlockPath
}
