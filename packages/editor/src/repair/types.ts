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

export type RepairSetFix = {
  type: 'set'
  path: Path
  value: unknown
  inverse:
    | {type: 'set'; path: Path; value: unknown}
    | {type: 'unset'; path: Path}
}

export type RepairInsertFix = {
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
