import type {FieldDefinition, OfDefinition} from '@portabletext/schema'
import type {ContainerConfig} from '../renderers/renderer.types'

export type ChildArrayField = FieldDefinition & {
  type: 'array'
  of: ReadonlyArray<OfDefinition>
}

/**
 * Public view of a registered editable container, surfaced on
 * {@link EditorContext.containers}.
 *
 * Two array properties named `of` live on the same entry with
 * different semantics:
 *
 * - `field.of` is the SCHEMA-DECLARED list of types this container's
 *   child field accepts (from `@portabletext/schema`'s
 *   `OfDefinition`). Tells you what the schema permits as children.
 * - `of` (top-level on `RegisteredContainer`) is the list of
 *   POSITIONAL CHILD REGISTRATIONS - nested
 *   {@link RegisteredContainer} or {@link RegisteredLeaf} entries -
 *   that override the global registration when the engine descends
 *   into this parent. Tells you which child renderings are scoped to
 *   this parent.
 *
 * The full container registration (including the render callback)
 * lives on the editor's internal {@link ResolvedContainers} map and
 * is not exposed on the public context.
 *
 * Two top-level entries with the same `_type` cannot coexist - the
 * register handler warns on duplicates. But the SAME `_type`
 * registered in two different parents' `of` arrays is supported as
 * a feature; `resolveContainerAt` walks the positional tree using
 * the path to return the entry that applies at a given position.
 *
 * @alpha
 */
export type RegisteredContainer = {
  type: string
  field: ChildArrayField
  of?: ReadonlyArray<RegisteredContainer | RegisteredLeaf>
}

/**
 * Public view of a registered leaf. Surfaced inside a containing
 * {@link RegisteredContainer}'s `of` array as a positional
 * registration that does not have editable children.
 *
 * @alpha
 */
export type RegisteredLeaf = {
  type: string
}

/**
 * Map of registered editable containers carried on `EditorContext`.
 *
 * Keyed by bare block-object `_type` (e.g. `'callout'`, `'table'`).
 * Each entry is a rich {@link RegisteredContainer} carrying its
 * `field` plus any positional `of` registrations.
 *
 * The map preserves positional structure: a `_type` declared inside
 * a parent's `of` array surfaces as a nested entry on that parent's
 * `of`, NOT as a separate top-level entry. Path-driven resolution
 * (see `resolveContainerAt`) reaches positional entries by walking
 * the tree.
 *
 * Top-level entries are global fallbacks: when path-driven descent
 * does not find a positional override, the resolver falls back to the
 * top-level entry for the type if one is registered.
 *
 * @alpha
 */
export type Containers = ReadonlyMap<string, RegisteredContainer>

/**
 * Engine-internal map carrying the fully-resolved container
 * configurations - including render functions and positional `of`
 * overrides. Lives on `editor.containers` and is consulted by render
 * dispatch and engine-internal helpers.
 *
 * Not exposed on {@link EditorContext}.
 */
export type ResolvedContainers = Map<string, ContainerConfig>
