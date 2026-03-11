/**
 * A segment in a path that identifies an element by its `_key` property.
 * @public
 */
export interface KeyedSegment {
  _key: string
}

/**
 * A tuple representing a range selection, e.g., `[0, 5]` or `['', 3]`.
 * @public
 */
export type IndexTuple = [number | '', number | '']

/**
 * A single segment in a path. Can be:
 * - A string (property name)
 * - A number (array index)
 * - A KeyedSegment (object with `_key`)
 * - An IndexTuple (range selection)
 * @public
 */
export type PathSegment = string | number | KeyedSegment | IndexTuple

/**
 * A path is an array of path segments that describes a location in a document.
 * @public
 */
export type Path = PathSegment[]

/**
 * @public
 */
export type BlockPath = [{_key: string}]

/**
 * @public
 */
export function isBlockPath(path: Path): path is BlockPath {
  const firstSegment = path.at(0)

  return (
    path.length === 1 &&
    firstSegment !== undefined &&
    isRecord(firstSegment) &&
    '_key' in firstSegment &&
    typeof firstSegment._key === 'string'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && (typeof value === 'object' || typeof value === 'function')
}

/**
 * @public
 */
export type AnnotationPath = [{_key: string}, 'markDefs', {_key: string}]

/**
 * @public
 */
export type ChildPath = [{_key: string}, 'children', {_key: string}]

/**
 * Check if a value is a KeyedSegment ({_key: string}).
 * @public
 */
export function isKeyedSegment(value: unknown): value is KeyedSegment {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_key' in value &&
    typeof (value as KeyedSegment)._key === 'string'
  )
}

/**
 * Resolve a path segment to a numeric index within a children array.
 *
 * - If the segment is a number, returns it directly.
 * - If the segment is a KeyedSegment, finds the child with the matching `_key`.
 * - Otherwise returns -1.
 *
 * @public
 */
export function resolveSegmentIndex(
  children: ArrayLike<unknown>,
  segment: PathSegment,
): number {
  if (typeof segment === 'number') {
    return segment
  }
  if (isKeyedSegment(segment)) {
    return Array.prototype.findIndex.call(
      children,
      (c: any) => c?._key === segment._key,
    )
  }
  return -1
}

/**
 * Get the last KeyedSegment from a path.
 * In a keyed path like [blockKey, 'children', spanKey], this returns spanKey.
 * Returns undefined if no keyed segment exists.
 *
 * @public
 */
export function lastKeyedSegment(path: Path): KeyedSegment | undefined {
  for (let i = path.length - 1; i >= 0; i--) {
    if (isKeyedSegment(path[i]!)) {
      return path[i] as KeyedSegment
    }
  }
  return undefined
}

/**
 * Get the child-identifying segment from a path.
 *
 * Handles both keyed paths and legacy numeric paths:
 * - Keyed: [blockKey, 'children', spanKey] → spanKey
 * - Numeric: [0, 1] → 1
 * - Block-level: [blockKey] or [0] → the single segment
 *
 * Returns the last segment that is either a KeyedSegment or a number.
 *
 * @public
 */
export function childSegment(path: Path): PathSegment | undefined {
  for (let i = path.length - 1; i >= 0; i--) {
    const seg = path[i]!
    if (isKeyedSegment(seg) || typeof seg === 'number') {
      return seg
    }
  }
  return undefined
}
