import type {Schema} from '@portabletext/schema'
import type {Path} from '../types/paths'

/**
 * One structural correction, shaped as the engine operation that applies
 * it. Inverses are part of the correction because they can't be derived from the
 * before and after values: an unusable `_key` of `''` is still undone
 * with `unset`.
 */
export type StructuralCorrection = {
  rule: StructuralRule
  type: 'set'
  path: Path
  value: unknown
  inverse:
    | {type: 'set'; path: Path; value: unknown}
    | {type: 'unset'; path: Path}
}

/**
 * Which rule produced a correction, so the engine can say what it
 * corrected. It isn't part of the operation and is dropped before the
 * correction is applied.
 */
export type StructuralRule =
  | 'missing-type'
  | 'missing-key'
  | 'duplicate-key'
  | 'span-text'
  | 'missing-children'

/**
 * `node` is `unknown` because rules run before the node's shape is
 * repaired, and the engine also visits its own root at path `[]`.
 */
export type CorrectionEntry = {
  node: unknown
  path: Path
  parent: {node: unknown; path: Path} | undefined
}

/**
 * `siblings` is the child array holding the node, as a function so it's
 * only resolved when the duplicate key rule inspects a keyed node. It may
 * return `undefined` when the caller already knows the array holds no
 * duplicate keys, which skips the scan.
 */
export type StructuralEntry = CorrectionEntry & {
  siblings: () => ReadonlyArray<{_key?: string}> | undefined
}

export type StructuralContext = {
  schema: Schema
  keyGenerator: () => string
}
