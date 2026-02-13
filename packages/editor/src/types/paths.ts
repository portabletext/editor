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
 * A path to a block in the document. Variable-length to support nested
 * containers — each segment identifies a block by `_key` at that depth.
 *
 * Examples:
 * - Top-level block: `[{_key: 'abc'}]`
 * - Nested block: `[{_key: 'container'}, {_key: 'child'}]`
 *
 * @public
 */
export type BlockPath = Array<{_key: string}>

/**
 * Type guard for BlockPath. A valid block path has at least one keyed segment
 * and all segments are keyed.
 * @public
 */
export function isBlockPath(path: Path): path is BlockPath {
  return (
    path.length >= 1 &&
    path.every(
      (segment) =>
        isRecord(segment) &&
        '_key' in segment &&
        typeof segment._key === 'string',
    )
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && (typeof value === 'object' || typeof value === 'function')
}

/**
 * A path to an annotation (markDef) within a block.
 * @public
 */
export type AnnotationPath = [...BlockPath, 'markDefs', {_key: string}]

/**
 * A path to a child (span or inline object) within a block.
 * @public
 */
export type ChildPath = [...BlockPath, 'children', {_key: string}]
