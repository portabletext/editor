import type {
  InsertNodeOperation,
  Operation,
  RemoveNodeOperation,
} from '..'

/**
 * `Path` arrays are a list of indexes that describe a node's exact position in
 * a Slate node tree. Although they are usually relative to the root `Editor`
 * object, they can be relative to any `Node` object.
 */

export type Path = number[]

export interface PathAncestorsOptions {
  reverse?: boolean
}

export interface PathLevelsOptions {
  reverse?: boolean
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
   * Compare a path to another, returning an integer indicating whether the path
   * was before, at, or after the other.
   *
   * Note: Two paths of unequal length can still receive a `0` result if one is
   * directly above or below the other. If you want exact matching, use
   * [[Path.equals]] instead.
   */
  compare: (path: Path, another: Path) => -1 | 0 | 1

  /**
   * Check if a path ends before one of the indexes in another.
   */
  endsBefore: (path: Path, another: Path) => boolean

  /**
   * Check if a path is exactly equal to another.
   */
  equals: (path: Path, another: Path) => boolean

  /**
   * Check if the path of previous sibling node exists
   */
  hasPrevious: (path: Path) => boolean

  /**
   * Check if a path is after another.
   */
  isAfter: (path: Path, another: Path) => boolean

  /**
   * Check if a path is an ancestor of another.
   */
  isAncestor: (path: Path, another: Path) => boolean

  /**
   * Check if a path is before another.
   */
  isBefore: (path: Path, another: Path) => boolean

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
   * Given a path, get the path to the next sibling node.
   */
  next: (path: Path) => Path

  /**
   * Returns whether this operation can affect paths or not. Used as an
   * optimization when updating dirty paths during normalization.
   */
  operationCanTransformPath: (
    operation: Operation,
  ) => operation is InsertNodeOperation | RemoveNodeOperation

  /**
   * Given a path, return a new path referring to the parent node above it.
   */
  parent: (path: Path) => Path

  /**
   * Given a path, get the path to the previous sibling node.
   */
  previous: (path: Path) => Path

  /**
   * Transform a path by an operation.
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

      if (av !== bv) {
        break
      }

      common.push(av)
    }

    return common
  },

  compare(path: Path, another: Path): -1 | 0 | 1 {
    const min = Math.min(path.length, another.length)

    for (let i = 0; i < min; i++) {
      if (path[i]! < another[i]!) {
        return -1
      }
      if (path[i]! > another[i]!) {
        return 1
      }
    }

    return 0
  },

  endsBefore(path: Path, another: Path): boolean {
    const i = path.length - 1
    const as = path.slice(0, i)
    const bs = another.slice(0, i)
    const av = path[i]!
    const bv = another[i]!
    return Path.equals(as, bs) && av < bv
  },

  equals(path: Path, another: Path): boolean {
    return (
      path.length === another.length && path.every((n, i) => n === another[i]!)
    )
  },

  hasPrevious(path: Path): boolean {
    return path[path.length - 1]! > 0
  },

  isAfter(path: Path, another: Path): boolean {
    return Path.compare(path, another) === 1
  },

  isAncestor(path: Path, another: Path): boolean {
    return path.length < another.length && Path.compare(path, another) === 0
  },

  isBefore(path: Path, another: Path): boolean {
    return Path.compare(path, another) === -1
  },

  isCommon(path: Path, another: Path): boolean {
    return path.length <= another.length && Path.compare(path, another) === 0
  },

  isDescendant(path: Path, another: Path): boolean {
    return path.length > another.length && Path.compare(path, another) === 0
  },

  isPath(value: any): value is Path {
    return (
      Array.isArray(value) &&
      (value.length === 0 || typeof value[0] === 'number')
    )
  },

  isSibling(path: Path, another: Path): boolean {
    if (path.length !== another.length) {
      return false
    }

    const as = path.slice(0, -1)
    const bs = another.slice(0, -1)
    const al = path[path.length - 1]
    const bl = another[another.length - 1]
    return al !== bl && Path.equals(as, bs)
  },

  levels(path: Path, options: PathLevelsOptions = {}): Path[] {
    const {reverse = false} = options
    const list: Path[] = []

    for (let i = 0; i <= path.length; i++) {
      list.push(path.slice(0, i))
    }

    if (reverse) {
      list.reverse()
    }

    return list
  },

  next(path: Path): Path {
    if (path.length === 0) {
      throw new Error(
        `Cannot get the next path of a root path [${path}], because it has no next index.`,
      )
    }

    const last = path[path.length - 1]!
    return path.slice(0, -1).concat(last + 1)
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

    return path.slice(0, -1)
  },

  previous(path: Path): Path {
    if (path.length === 0) {
      throw new Error(
        `Cannot get the previous path of a root path [${path}], because it has no previous index.`,
      )
    }

    const last = path[path.length - 1]!

    if (last <= 0) {
      throw new Error(
        `Cannot get the previous path of a first child path [${path}] because it would result in a negative index.`,
      )
    }

    return path.slice(0, -1).concat(last - 1)
  },

  transform(path: Path | null, operation: Operation): Path | null {
    if (!path) {
      return null
    }

    // PERF: use destructing instead of immer
    const p = [...path]

    // PERF: Exit early if the operation is guaranteed not to have an effect.
    if (path.length === 0) {
      return p
    }

    switch (operation.type) {
      case 'insert_node': {
        const {path: op} = operation

        if (
          Path.equals(op, p) ||
          Path.endsBefore(op, p) ||
          Path.isAncestor(op, p)
        ) {
          p[op.length - 1] = p[op.length - 1]! + 1
        }

        break
      }

      case 'remove_node': {
        const {path: op} = operation

        if (Path.equals(op, p) || Path.isAncestor(op, p)) {
          return null
        } else if (Path.endsBefore(op, p)) {
          p[op.length - 1] = p[op.length - 1]! - 1
        }

        break
      }
    }

    return p
  },
}
