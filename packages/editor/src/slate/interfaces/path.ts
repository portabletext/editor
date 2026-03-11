import type {InsertNodeOperation, Operation, RemoveNodeOperation} from '..'
import type {
  KeyedSegment,
  Path as PtePath,
  PathSegment,
} from '../../types/paths'

/**
 * `Path` arrays are a list of segments that describe a node's exact position
 * in a Slate node tree. Segments alternate between keyed segments
 * (`{_key: string}`) that identify nodes and string segments that name the
 * field to traverse into.
 *
 * Example: `[{_key: 'table0'}, 'rows', {_key: 'row1'}, 'cells', {_key: 'cell2'}]`
 */

export type Path = PtePath

export interface PathAncestorsOptions {
  reverse?: boolean
}

export interface PathLevelsOptions {
  reverse?: boolean
}

/**
 * Check if a value is a KeyedSegment ({_key: string}).
 */
function isKeyedSegment(value: unknown): value is KeyedSegment {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_key' in value &&
    typeof (value as KeyedSegment)._key === 'string'
  )
}

/**
 * Compare two path segments for equality.
 */
function segmentsEqual(a: PathSegment, b: PathSegment): boolean {
  if (isKeyedSegment(a) && isKeyedSegment(b)) {
    return a._key === b._key
  }
  return a === b
}

export interface PathInterface {
  /**
   * Get a list of ancestor paths for a given path.
   *
   * The paths are sorted from shallowest to deepest ancestor. However, if the
   * `reverse: true` option is passed, they are reversed.
   */
  ancestors: (path: Path, options?: PathAncestorsOptions) => Path[]

  /**
   * Get the common ancestor path of two paths.
   */
  common: (path: Path, another: Path) => Path

  /**
   * Check if a path ends before one of the segments in another.
   * Both paths must share the same ancestor up to the second-to-last segment
   * of `path`, and then `path`'s final keyed segment must appear earlier in
   * the parent's children than `another`'s corresponding segment.
   *
   * With keyed paths, this requires tree context to determine ordering.
   * For now, this checks structural prefix relationships only.
   */
  endsBefore: (path: Path, another: Path) => boolean

  /**
   * Check if a path is exactly equal to another.
   */
  equals: (path: Path, another: Path) => boolean

  /**
   * Check if a path is an ancestor of another.
   */
  isAncestor: (path: Path, another: Path) => boolean

  /**
   * Check if a path is equal to or an ancestor of another.
   */
  isCommon: (path: Path, another: Path) => boolean

  /**
   * Check if a path is a descendant of another.
   */
  isDescendant: (path: Path, another: Path) => boolean

  /**
   * Check is a value implements the `Path` interface.
   */
  isPath: (value: any) => value is Path

  /**
   * Check if a path is a sibling of another.
   */
  isSibling: (path: Path, another: Path) => boolean

  /**
   * Get a list of paths at every level down to a path. Note: this is the same
   * as `Path.ancestors`, but including the path itself.
   *
   * The paths are sorted from shallowest to deepest. However, if the `reverse:
   * true` option is passed, they are reversed.
   */
  levels: (path: Path, options?: PathLevelsOptions) => Path[]

  /**
   * Returns whether this operation can affect paths or not. Used as an
   * optimization when updating dirty paths during normalization.
   */
  operationCanTransformPath: (
    operation: Operation,
  ) => operation is InsertNodeOperation | RemoveNodeOperation

  /**
   * Given a path, return a new path referring to the parent node above it.
   * For keyed paths, this drops the last keyed segment and its preceding
   * field name (if any).
   */
  parent: (path: Path) => Path

  /**
   * Transform a path by an operation.
   *
   * With keyed paths:
   * - `insert_node` is a no-op (keys don't shift)
   * - `remove_node` returns null if the operation's path is a prefix of
   *   (or equal to) this path
   */
  transform: (path: Path, operation: Operation) => Path | null
}

// eslint-disable-next-line no-redeclare
export const Path: PathInterface = {
  ancestors(path: Path, options: PathAncestorsOptions = {}): Path[] {
    const {reverse = false} = options
    let paths = Path.levels(path, options)

    if (reverse) {
      paths = paths.slice(1)
    } else {
      paths = paths.slice(0, -1)
    }

    return paths
  },

  common(path: Path, another: Path): Path {
    const common: Path = []

    for (let i = 0; i < path.length && i < another.length; i++) {
      const av = path[i]!
      const bv = another[i]!

      if (!segmentsEqual(av, bv)) {
        break
      }

      common.push(av)
    }

    return common
  },

  endsBefore(path: Path, another: Path): boolean {
    // With keyed paths, we can only check structural relationships.
    // Two paths "end before" if they share the same parent path and
    // the final segments differ. Actual ordering requires tree context.
    // This is kept for compatibility but callers that need true ordering
    // should use Node-level utilities.
    const i = path.length - 1
    if (i < 0 || i >= another.length) {
      return false
    }
    const as = path.slice(0, i)
    const bs = another.slice(0, i)
    const av = path[i]!
    const bv = another[i]!
    return Path.equals(as, bs) && !segmentsEqual(av, bv)
  },

  equals(path: Path, another: Path): boolean {
    return (
      path.length === another.length &&
      path.every((segment, i) => segmentsEqual(segment, another[i]!))
    )
  },

  isAncestor(path: Path, another: Path): boolean {
    return (
      path.length < another.length &&
      path.every((segment, i) => segmentsEqual(segment, another[i]!))
    )
  },

  isCommon(path: Path, another: Path): boolean {
    return (
      path.length <= another.length &&
      path.every((segment, i) => segmentsEqual(segment, another[i]!))
    )
  },

  isDescendant(path: Path, another: Path): boolean {
    return (
      path.length > another.length &&
      another.every((segment, i) => segmentsEqual(segment, path[i]!))
    )
  },

  isPath(value: any): value is Path {
    return (
      Array.isArray(value) &&
      (value.length === 0 ||
        typeof value[0] === 'string' ||
        typeof value[0] === 'number' ||
        isKeyedSegment(value[0]))
    )
  },

  isSibling(path: Path, another: Path): boolean {
    if (path.length !== another.length || path.length === 0) {
      return false
    }

    const as = path.slice(0, -1)
    const bs = another.slice(0, -1)
    const al = path[path.length - 1]!
    const bl = another[another.length - 1]!
    return !segmentsEqual(al, bl) && Path.equals(as, bs)
  },

  levels(path: Path, options: PathLevelsOptions = {}): Path[] {
    const {reverse = false} = options
    const list: Path[] = []

    // For keyed paths, levels are at each keyed segment boundary.
    // A path like [{_key: 'a'}, 'children', {_key: 'b'}] has levels:
    // [], [{_key: 'a'}], [{_key: 'a'}, 'children', {_key: 'b'}]
    //
    // We include the empty path (root) and each prefix that ends with
    // a keyed segment.
    list.push([])

    for (let i = 0; i < path.length; i++) {
      const segment = path[i]!
      if (isKeyedSegment(segment)) {
        list.push(path.slice(0, i + 1))
      }
    }

    // If the path doesn't end with a keyed segment (e.g., ends with a
    // field name), include the full path too.
    if (path.length > 0 && !isKeyedSegment(path[path.length - 1]!)) {
      list.push([...path])
    }

    if (reverse) {
      list.reverse()
    }

    return list
  },

  operationCanTransformPath(
    operation: Operation,
  ): operation is InsertNodeOperation | RemoveNodeOperation {
    switch (operation.type) {
      case 'insert_node':
      case 'remove_node':
        return true
      default:
        return false
    }
  },

  parent(path: Path): Path {
    if (path.length === 0) {
      throw new Error(`Cannot get the parent path of the root path [${path}].`)
    }

    // For keyed paths, the parent is found by dropping the last keyed
    // segment and its preceding field name.
    // [{_key: 'a'}, 'children', {_key: 'b'}] -> [{_key: 'a'}]
    // [{_key: 'a'}] -> []
    const lastKeyedIndex = findLastKeyedIndex(path)

    if (lastKeyedIndex <= 0) {
      // Path is just [{_key: 'x'}] or similar — parent is root
      return []
    }

    // Drop the field name before the last keyed segment too
    // e.g., [{_key: 'a'}, 'children', {_key: 'b'}] -> [{_key: 'a'}]
    const fieldNameIndex = lastKeyedIndex - 1
    if (fieldNameIndex >= 0 && typeof path[fieldNameIndex] === 'string') {
      return path.slice(0, fieldNameIndex)
    }

    return path.slice(0, lastKeyedIndex)
  },

  transform(path: Path | null, operation: Operation): Path | null {
    if (!path) {
      return null
    }

    // With keyed paths, transforms are trivial:
    // - insert_node: keys don't shift, so the path is unchanged
    // - remove_node: if the removed node's path is this path or an
    //   ancestor of it, the path no longer exists (return null)
    switch (operation.type) {
      case 'insert_node': {
        // No-op: inserting a node doesn't affect keyed paths
        return [...path]
      }

      case 'remove_node': {
        const {path: op} = operation

        if (Path.equals(op, path) || Path.isAncestor(op, path)) {
          return null
        }

        return [...path]
      }
    }

    return [...path]
  },
}

/**
 * Find the index of the last KeyedSegment in a path.
 */
function findLastKeyedIndex(path: Path): number {
  for (let i = path.length - 1; i >= 0; i--) {
    if (isKeyedSegment(path[i]!)) {
      return i
    }
  }
  return -1
}
