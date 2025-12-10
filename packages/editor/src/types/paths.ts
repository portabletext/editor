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
