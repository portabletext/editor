// Keep in sync with `packages/editor/src/schema/container-types.ts`.
import type {FieldDefinition, OfDefinition} from '@portabletext/schema'

/**
 * Public view of a registered editable container, surfaced on
 * `TraversalSnapshot` `context.containers`.
 *
 * Two array properties named `of` live on the same entry with
 * different semantics:
 *
 * - `field.of` is the SCHEMA-DECLARED list of types this container's
 *   child field accepts (from `@portabletext/schema`'s
 *   `OfDefinition`). Tells you what the schema permits as children.
 * - `of` (top-level on `RegisteredContainer`) is the list of
 *   POSITIONAL CHILD REGISTRATIONS - nested
 *   {@link RegisteredContainer} or {@link RegisteredPositional}
 *   entries - that override the global registration when a lookup
 *   descends into this parent. Tells you which child registrations are
 *   scoped to this parent.
 *
 * Two top-level entries with the same `_type` cannot coexist:
 * `compileContainers` keeps the last declaration of a top-level type.
 * But the SAME `_type` declared in two different parents' `of` arrays
 * is supported as a feature; lookups walk the positional tree using
 * the path to find the entry that applies at a given position.
 *
 * @public
 */
export type RegisteredContainer = {
  kind: 'container'
  type: string
  field: FieldDefinition & {
    type: 'array'
    of: ReadonlyArray<OfDefinition>
  }
  of?: ReadonlyArray<RegisteredContainer | RegisteredPositional>
}

export type ChildArrayField = RegisteredContainer['field']

/**
 * Public view of a registered span, surfaced inside a containing
 * {@link RegisteredContainer}'s `of` array as a positional
 * registration.
 *
 * @public
 */
export type RegisteredSpan = {
  kind: 'span'
  type: string
}

/**
 * Public view of a registered block object, surfaced inside a
 * containing {@link RegisteredContainer}'s `of` array as a positional
 * registration.
 *
 * @public
 */
export type RegisteredBlockObject = {
  kind: 'blockObject'
  type: string
}

/**
 * Public view of a registered inline object, surfaced inside a
 * containing {@link RegisteredContainer}'s `of` array as a positional
 * registration.
 *
 * @public
 */
export type RegisteredInlineObject = {
  kind: 'inlineObject'
  type: string
}

/**
 * Union of non-container positional registrations that may appear in
 * a {@link RegisteredContainer}'s `of` array. Text-block registrations
 * are NOT included here and do not appear on the containers tree.
 *
 * @public
 */
export type RegisteredPositional =
  | RegisteredSpan
  | RegisteredBlockObject
  | RegisteredInlineObject

/**
 * Map of registered editable containers carried on `TraversalSnapshot`
 * `context.containers`.
 *
 * Keyed by bare block-object `_type` (e.g. `'callout'`, `'table'`).
 * Each entry is a rich {@link RegisteredContainer} carrying its
 * `field` plus any positional `of` registrations.
 *
 * The map preserves positional structure: a `_type` declared inside
 * a parent's `of` array surfaces as a nested entry on that parent's
 * `of`, NOT as a separate top-level entry. Path-driven resolution
 * reaches positional entries by walking the tree.
 *
 * Top-level entries are global fallbacks: when path-driven descent
 * does not find a positional override, the resolver falls back to the
 * top-level entry for the type if one is registered.
 *
 * @public
 */
export type Containers = ReadonlyMap<string, RegisteredContainer>
