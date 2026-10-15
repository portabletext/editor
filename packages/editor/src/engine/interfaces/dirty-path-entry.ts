import type {Path} from './path'

/**
 * A path an operation dirtied, named by its relation to the operation.
 * An `adjacency` entry is not a node to normalize: it records the siblings
 * that a node removal made adjacent, under the removed node's parent.
 */
export type DirtyPath =
  | {
      path: Path
      kind: 'node' | 'ancestor' | 'descendant' | 'neighbour'
    }
  | {
      path: Path
      kind: 'adjacency'
      adjacency: {previous: Path; next: Path}
    }

export type DirtyPathOrigin = 'local' | 'remote' | 'normalization' | 'force'

export type DirtyPathEntry = DirtyPath & {origin: DirtyPathOrigin}
