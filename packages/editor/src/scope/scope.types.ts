import type {SchemaDefinition} from '@portabletext/schema'

/**
 * @internal
 *
 * Scope grammar types for expressing positions in the schema tree.
 *
 * Scopes use a JSONPath-inspired grammar:
 * - `$.` = root anchor. Terminal type must be at the editor's root.
 * - `$..` = descendant. Matches at any depth.
 * - Middle `..` (e.g., `$..table..span`) skips over intermediate types.
 * - Segments are type names only. Field names never appear in scope.
 *
 * See `/specs/scope-grammar.md` for the full spec.
 */

// ============================================================================
// Schema walking helpers
// ============================================================================

/**
 * @internal
 *
 * Extracts the names of array-typed fields from a field list.
 * Array fields are the ones that can hold editable children (containers).
 */
type ExtractArrayFields<TFields> = TFields extends readonly [
  infer TField,
  ...infer TRest,
]
  ? TField extends {name: infer TName extends string; type: 'array'}
    ? TName | ExtractArrayFields<TRest>
    : ExtractArrayFields<TRest>
  : never

/**
 * @internal
 *
 * Walks the `of` members of array fields, extracting member types with their
 * own field lists (so we can recurse into nested containers).
 */
type ExtractOfMembers<TOfMembers> = TOfMembers extends readonly [
  infer TMember,
  ...infer TRest,
]
  ? TMember extends {
      type: infer TTypeName extends string
      fields?: infer TFields
    }
    ? {type: TTypeName; fields: TFields} | ExtractOfMembers<TRest>
    : ExtractOfMembers<TRest>
  : never

/**
 * @internal
 *
 * Walks fields and returns the `of` members of their array fields.
 */
type WalkFields<TFields> = TFields extends readonly [
  infer TField,
  ...infer TRest,
]
  ? TField extends {type: 'array'; of?: infer TOf}
    ? ExtractOfMembers<TOf> | WalkFields<TRest>
    : WalkFields<TRest>
  : never

// ============================================================================
// Container and leaf type discovery
// ============================================================================

/**
 * @internal
 *
 * Discovers container types nested inside a field list.
 * Each entry records the type's chain (dot-separated) and its array fields.
 */
type DiscoverContainers<TFields, TChain extends string> =
  WalkFields<TFields> extends infer TMembers
    ? TMembers extends {
        type: infer TTypeName extends string
        fields: infer TNestedFields
      }
      ? TTypeName extends 'block'
        ? {chain: `${TChain}.block`; arrayFields: 'children'}
        : ExtractArrayFields<TNestedFields> extends never
          ? DiscoverContainers<TNestedFields, `${TChain}.${TTypeName}`>
          :
              | {
                  chain: `${TChain}.${TTypeName}`
                  arrayFields: ExtractArrayFields<TNestedFields>
                }
              | DiscoverContainers<TNestedFields, `${TChain}.${TTypeName}`>
      : never
    : never

/**
 * @internal
 *
 * Discovers leaf types nested inside a field list. A leaf is a type that
 * appears as a member of an array but has no array fields of its own
 * (void block objects). Spans and inline objects are handled separately
 * at the top level via `AllLeaves`.
 */
type DiscoverLeaves<TFields, TChain extends string> =
  WalkFields<TFields> extends infer TMembers
    ? TMembers extends {
        type: infer TTypeName extends string
        fields: infer TNestedFields
      }
      ? TTypeName extends 'block'
        ? never
        : ExtractArrayFields<TNestedFields> extends never
          ? {type: TTypeName; chain: TChain; parent: 'container'}
          : DiscoverLeaves<TNestedFields, `${TChain}.${TTypeName}`>
      : never
    : never

// ============================================================================
// Schema entry points
// ============================================================================

/**
 * @internal
 *
 * All containers discoverable from a schema.
 *
 * Always includes `{chain: 'block', arrayFields: 'children'}` for root text
 * blocks. Additionally includes every top-level block object that has array
 * fields, plus every nested container type recursively.
 */
type AllContainers<TSchema extends SchemaDefinition> =
  | {chain: 'block'; arrayFields: 'children'}
  | (TSchema['blockObjects'] extends ReadonlyArray<infer TBlockObject>
      ? TBlockObject extends {
          name: infer TName extends string
          fields?: infer TFields
        }
        ? ExtractArrayFields<TFields> extends never
          ? DiscoverContainers<TFields, TName>
          :
              | {chain: TName; arrayFields: ExtractArrayFields<TFields>}
              | DiscoverContainers<TFields, TName>
        : never
      : never)

/**
 * @internal
 *
 * All leaves discoverable from a schema.
 *
 * Leaves come from three sources:
 * - Spans: always available, sit inside text blocks.
 * - Inline objects: from `schema.inlineObjects`, sit inside text blocks.
 * - Void block objects: top-level block objects with no array fields, plus
 *   any nested block objects without array fields inside containers.
 */
type AllLeaves<TSchema extends SchemaDefinition> =
  | {type: 'span'; chain: ''; parent: 'block'}
  | (TSchema['inlineObjects'] extends ReadonlyArray<infer TInlineObject>
      ? TInlineObject extends {name: infer TName extends string}
        ? {type: TName; chain: ''; parent: 'block'}
        : never
      : never)
  | (TSchema['blockObjects'] extends ReadonlyArray<infer TBlockObject>
      ? TBlockObject extends {
          name: infer TName extends string
          fields?: infer TFields
        }
        ? ExtractArrayFields<TFields> extends never
          ? {type: TName; chain: ''; parent: 'container'}
          : DiscoverLeaves<TFields, TName>
        : never
      : never)

// ============================================================================
// Chain composition
// ============================================================================

/**
 * @internal
 *
 * Every container chain as an exact dotted string.
 */
type ContainerTerminal<TSchema extends SchemaDefinition> =
  AllContainers<TSchema> extends {chain: infer TChain extends string}
    ? TChain
    : never

/**
 * @internal
 *
 * Build middle-`..` chain variants from a head and rest.
 *
 * For head="table", rest="row.cell", produces:
 *   "table..row.cell" | "table..cell"
 * Recurses with the next head ("row") for additional pairs.
 */
type BuildMiddleChains<THead extends string, TRest extends string> =
  | `${THead}..${TRest}`
  | (TRest extends `${string}.${infer TTail}`
      ? BuildMiddleChains<THead, TTail>
      : never)
  | (TRest extends `${infer TInner}.${infer TTail}`
      ? BuildMiddleChains<TInner, TTail>
      : never)

/**
 * @internal
 *
 * All middle-`..` chain variants for the schema. For every (ancestor,
 * descendant) pair in a discovered container chain, emits `ancestor..descendant`.
 */
type MiddleChains<TSchema extends SchemaDefinition> =
  ContainerTerminal<TSchema> extends infer TChain extends string
    ? TChain extends `${infer THead}.${infer TRest}`
      ? BuildMiddleChains<THead, TRest>
      : never
    : never

/**
 * @internal
 *
 * All valid container chains: exact dotted chains plus middle-`..` variants.
 */
type ContainerChain<TSchema extends SchemaDefinition> =
  | ContainerTerminal<TSchema>
  | MiddleChains<TSchema>

// ============================================================================
// Public scope types
// ============================================================================

/**
 * @internal
 *
 * Valid scopes for `defineContainer` (and, in the future, `defineBehavior`).
 * Terminal type must be a container (text block or editable container type).
 *
 * Examples for a schema with `callout.content` containing blocks:
 * ```
 * '$.block' | '$..block'
 * '$.callout' | '$..callout'
 * '$.callout.block' | '$..callout.block'
 * '$.callout..block' | '$..callout..block'
 * ```
 */
export type ContainerScope<TSchema extends SchemaDefinition> =
  | `$.${ContainerChain<TSchema>}`
  | `$..${ContainerChain<TSchema>}`

/**
 * @internal
 *
 * Valid scopes for `defineLeaf`. Terminal type must be a leaf.
 *
 * Leaf terminals:
 * - Span (`span`) and inline objects require `block.` as immediate parent.
 * - Void block objects can appear at root or inside any container chain.
 */
export type LeafScope<TSchema extends SchemaDefinition> =
  | VoidBlockLeafScope<TSchema>
  | TextBlockLeafScope<TSchema>

/**
 * @internal
 *
 * Scopes whose terminal is a void block object.
 * Can appear at root or inside any container chain.
 */
type VoidBlockLeafScope<TSchema extends SchemaDefinition> =
  AllLeaves<TSchema> extends infer TLeaf
    ? TLeaf extends {
        type: infer TType extends string
        chain: infer TChain extends string
        parent: 'container'
      }
      ? TChain extends ''
        ? `$.${TType}` | `$..${TType}`
        :
            | `$.${TChain}.${TType}`
            | `$..${TChain}.${TType}`
            | `$.${TChain}..${TType}`
            | `$..${TChain}..${TType}`
      : never
    : never

/**
 * @internal
 *
 * All container chains that end in `.block` (or are exactly `block`).
 * These are the valid "parent" chains for spans and inline objects.
 */
type TextBlockContainerChain<TSchema extends SchemaDefinition> =
  ContainerChain<TSchema> extends infer TChain extends string
    ? TChain extends 'block'
      ? TChain
      : TChain extends `${string}.block`
        ? TChain
        : TChain extends `${string}..block`
          ? TChain
          : never
    : never

/**
 * @internal
 *
 * Scopes whose terminal is a span or inline object.
 * Must have `block.` as immediate parent segment.
 * Text block can be at root or inside any container chain.
 */
type TextBlockLeafScope<TSchema extends SchemaDefinition> =
  AllLeaves<TSchema> extends infer TLeaf
    ? TLeaf extends {
        type: infer TType extends string
        parent: 'block'
      }
      ? TextBlockContainerChain<TSchema> extends infer TChain extends string
        ? TChain extends TChain
          ? `$.${TChain}.${TType}` | `$..${TChain}.${TType}`
          : never
        : never
      : never
    : never
