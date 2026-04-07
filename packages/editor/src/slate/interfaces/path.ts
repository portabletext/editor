import type {KeyedSegment} from '../../types/paths'

/**
 * A path segment identifies a position in the document tree.
 *
 * - `KeyedSegment` (`{_key: string}`) identifies a node by its key
 * - `string` identifies a child field name (e.g. 'children', 'rows', 'cells')
 * - `number` identifies a position in an array (used for empty container inserts
 *   and rendering indexed paths)
 */
export type PathSegment = KeyedSegment | string | number

/**
 * A `Path` is a list of segments that describe a node's exact position in
 * the document tree. Segments alternate between keyed node references and
 * field names: `[{_key: 'b1'}, 'children', {_key: 's1'}]`.
 */
export type Path = PathSegment[]
