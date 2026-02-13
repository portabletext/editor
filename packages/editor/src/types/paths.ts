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
 * A path to a block in the document. Alias for `Path` — preserves semantic
 * meaning in selector return types and behavior events.
 *
 * With containers, block paths include field name segments:
 * - Top-level block: `[{_key: 'abc'}]`
 * - Nested block: `[{_key: 'container'}, 'rows', 0, 'cells', 1, 'content', {_key: 'child'}]`
 *
 * @public
 */
export type BlockPath = Path

/**
 * Type guard for BlockPath. A valid block path has at least one segment
 * and ends with a keyed segment (identifying the block).
 * @public
 */
export function isBlockPath(path: Path): path is BlockPath {
  if (path.length < 1) {
    return false
  }

  const lastSegment = path[path.length - 1]

  return (
    isRecord(lastSegment) &&
    '_key' in lastSegment &&
    typeof lastSegment._key === 'string'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && (typeof value === 'object' || typeof value === 'function')
}

/**
 * A path to an annotation (markDef) within a block.
 * @public
 */
export type AnnotationPath = [...Path, 'markDefs', {_key: string}]

/**
 * A path to a child (span or inline object) within a block.
 * @public
 */
export type ChildPath = [...Path, 'children', {_key: string}]
