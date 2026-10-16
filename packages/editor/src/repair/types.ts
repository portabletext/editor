import type {
  FieldDefinition,
  OfDefinition,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  Schema,
} from '@portabletext/schema'
import type {Path} from '../types/paths'

export type RepairNode =
  | PortableTextTextBlock
  | PortableTextObject
  | PortableTextSpan

/**
 * One structural fix, shaped as the engine operation that applies it.
 * Inverses are part of the fix because they can't be derived from the
 * before and after values: an unusable `_key` of `''` is still undone
 * with `unset`.
 */
export type RepairFix = RepairSetFix | RepairInsertFix

/**
 * Which rule produced a fix, so the engine can say what it repaired. It
 * isn't part of the operation and is dropped before the fix is applied.
 */
export type RepairRule =
  | 'missing-type'
  | 'missing-key'
  | 'duplicate-key'
  | 'span-text'
  | 'container-field'
  | 'missing-children'
  | 'empty-children'
  | 'inline-object-bracketing'

export type RepairSetFix = {
  rule: RepairRule
  type: 'set'
  path: Path
  value: unknown
  inverse:
    | {type: 'set'; path: Path; value: unknown}
    | {type: 'unset'; path: Path}
}

export type RepairInsertFix = {
  rule: RepairRule
  type: 'insert'
  path: Path
  node: RepairNode
  position: 'before' | 'after'
}

/**
 * `node` is `unknown` because rules run before the node's shape is
 * repaired, and the engine also visits its own root at path `[]`.
 */
export type RepairEntry = {
  node: unknown
  path: Path
  parent: {node: unknown; path: Path} | undefined
}

/**
 * What the rules need from the engine beyond the node itself, as functions
 * so they're only resolved for the nodes a rule actually inspects.
 * `siblings` is the child array holding the node. `container` is the child
 * array field the engine resolved for the node at this position, or
 * `undefined` when the node isn't a container here; `placeholderStyle` is
 * only called when a placeholder text block is created, since resolving it
 * walks the node's ancestors.
 */
export type RepairNodeEntry = RepairEntry & {
  siblings: () => ReadonlyArray<{_key?: string}>
  container: () =>
    | {field: RepairContainerField; placeholderStyle: () => string}
    | undefined
}

export type RepairContext = {
  schema: Schema
  keyGenerator: () => string
  /**
   * Serialized paths of sibling groups already verified to hold unique
   * keys. Owned and invalidated by the engine; rules only read and add.
   */
  verifiedUniqueGroups: Set<string>
}

export type RepairContainerField = FieldDefinition & {
  type: 'array'
  of: ReadonlyArray<OfDefinition>
}
