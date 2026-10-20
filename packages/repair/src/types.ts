import type {Patch, Path} from '@portabletext/patches'
import type {Schema} from '@portabletext/schema'

/**
 * One structural correction: the rule that found the flaw and the patches
 * that fix it. Apply the patches in order.
 *
 * @public
 */
export type StructuralCorrection = {
  type: StructuralRule
  patches: Array<Patch>
}

/**
 * The structural flaw a correction fixes.
 *
 * @public
 */
export type StructuralRule =
  | 'missing-type'
  | 'missing-key'
  | 'duplicate-key'
  | 'span-text'
  | 'missing-children'

/**
 * A node and where it sits in the value. `node` is `unknown` because rules
 * run before the node's shape is repaired, and the caller may also visit
 * the root at path `[]`.
 *
 * `siblings` is the child array holding the node, as a function so it's
 * only resolved when the duplicate key rule inspects a keyed node. It may
 * return `undefined` when the caller already knows the array holds no
 * duplicate keys, which skips the scan.
 *
 * @public
 */
export type StructuralEntry = CorrectionEntry & {
  siblings: () => ReadonlyArray<{_key?: string}> | undefined
}

/**
 * Schema and key generation available to structural rules.
 *
 * @public
 */
export type StructuralContext = {
  schema: Schema
  keyGenerator: () => string
}

export type CorrectionEntry = {
  node: unknown
  path: Path
  parent: {node: unknown; path: Path} | undefined
}
