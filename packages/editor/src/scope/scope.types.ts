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
 *
 * Three forms:
 * - Inline declarations (`type: 'object'`) - segment name comes from `name`,
 *   shape comes from `fields`. Emitted as `{type: TName; fields: TFields}`.
 * - Block declarations (`type: 'block'`) - emitted as `{type: 'block'; fields: TFields}`.
 * - Bare references (no `fields`, type !== 'object'/'block') - emitted as
 *   `{ref: TName}`. The consumer (`DiscoverContainers` / `DiscoverLeaves`)
 *   resolves these by looking up `TName` in the schema's `blockObjects`.
 */
type ExtractOfMembers<TOfMembers> = TOfMembers extends readonly [
  infer TMember,
  ...infer TRest,
]
  ? TMember extends {
      type: 'object'
      name: infer TName extends string
      fields: infer TFields
    }
    ? {type: TName; fields: TFields} | ExtractOfMembers<TRest>
    : TMember extends {
          type: 'block'
          fields?: infer TFields
        }
      ? {type: 'block'; fields: TFields} | ExtractOfMembers<TRest>
      : TMember extends {type: infer TRefName extends string}
        ? {ref: TRefName} | ExtractOfMembers<TRest>
        : ExtractOfMembers<TRest>
  : never

/**
 * @internal
 *
 * Look up a block object by name in a schema's `blockObjects` list.
 * Returns the block object's fields, or `never` if no match.
 */
type LookupBlockObject<TSchema extends SchemaDefinition, TName extends string> =
  TSchema['blockObjects'] extends ReadonlyArray<infer TBlockObject>
    ? TBlockObject extends {name: TName; fields?: infer TFields}
      ? TFields
      : never
    : never

/**
 * @internal
 *
 * Look up a name in the ancestor chain. The chain is a tuple of
 * `{name, fields}` pairs accumulated by the walk. Returns the matching
 * fields, or `never` if no ancestor declares the name.
 *
 * This lets references resolve to types declared inline by an ancestor,
 * not just types at the schema root. Mirrors the runtime resolver's
 * ancestor-fields map.
 */
type LookupAncestor<
  TAncestors extends ReadonlyArray<{name: string; fields: unknown}>,
  TName extends string,
> = TAncestors extends readonly [
  infer TFirst extends {name: string; fields: unknown},
  ...infer TRest extends ReadonlyArray<{name: string; fields: unknown}>,
]
  ? TFirst['name'] extends TName
    ? TFirst['fields']
    : LookupAncestor<TRest, TName>
  : never

/**
 * @internal
 *
 * Resolve a reference's fields. Checks ancestors first (inline-declared
 * types are visible to descendants), then falls back to the schema root.
 */
type ResolveReference<
  TSchema extends SchemaDefinition,
  TName extends string,
  TAncestors extends ReadonlyArray<{name: string; fields: unknown}>,
> =
  LookupAncestor<TAncestors, TName> extends infer TAncestorFields
    ? [TAncestorFields] extends [never]
      ? LookupBlockObject<TSchema, TName>
      : TAncestorFields
    : LookupBlockObject<TSchema, TName>

/**
 * @internal
 *
 * Test whether a name is in the ancestor chain.
 */
type AncestorHasName<
  TAncestors extends ReadonlyArray<{name: string; fields: unknown}>,
  TName extends string,
> = TAncestors extends readonly [
  infer TFirst extends {name: string},
  ...infer TRest extends ReadonlyArray<{name: string; fields: unknown}>,
]
  ? TFirst['name'] extends TName
    ? true
    : AncestorHasName<TRest, TName>
  : false

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

/**
 * @internal
 *
 * Discovers container types nested inside a field list.
 * Each entry records the type's chain (dot-separated) and its array fields.
 *
 * Walks both inline declarations and bare references. References are
 * resolved by looking up the type-name in the schema's `blockObjects`.
 * Cycle detection: an `TAncestors` tuple tracks names already on the
 * current walk path; references whose name matches an ancestor are
 * not followed.
 */
type DiscoverContainers<
  TSchema extends SchemaDefinition,
  TFields,
  TChain extends string,
  TAncestors extends ReadonlyArray<{name: string; fields: unknown}> = [],
> =
  WalkFields<TFields> extends infer TMembers
    ? TMembers extends {ref: infer TRefName extends string}
      ? AncestorHasName<TAncestors, TRefName> extends true
        ? // Cycle: emit a candidate at this depth using the ancestor's
          // fields, but do NOT recurse further. `..` segments in scopes
          // cover deeper depths.
          LookupAncestor<TAncestors, TRefName> extends infer TCycleFields
          ? TCycleFields extends ReadonlyArray<unknown>
            ? ExtractArrayFields<TCycleFields> extends never
              ? never
              : {
                  chain: `${TChain}.${TRefName}`
                  arrayFields: ExtractArrayFields<TCycleFields>
                }
            : never
          : never
        : ResolveReference<
              TSchema,
              TRefName,
              TAncestors
            > extends infer TRefFields
          ? TRefFields extends ReadonlyArray<unknown>
            ? ExtractArrayFields<TRefFields> extends never
              ? DiscoverContainers<
                  TSchema,
                  TRefFields,
                  `${TChain}.${TRefName}`,
                  [{name: TRefName; fields: TRefFields}, ...TAncestors]
                >
              :
                  | {
                      chain: `${TChain}.${TRefName}`
                      arrayFields: ExtractArrayFields<TRefFields>
                    }
                  | DiscoverContainers<
                      TSchema,
                      TRefFields,
                      `${TChain}.${TRefName}`,
                      [{name: TRefName; fields: TRefFields}, ...TAncestors]
                    >
            : never
          : never
      : TMembers extends {
            type: infer TTypeName extends string
            fields: infer TNestedFields
          }
        ? TTypeName extends 'block'
          ? {chain: `${TChain}.block`; arrayFields: 'children'}
          : ExtractArrayFields<TNestedFields> extends never
            ? DiscoverContainers<
                TSchema,
                TNestedFields,
                `${TChain}.${TTypeName}`,
                [{name: TTypeName; fields: TNestedFields}, ...TAncestors]
              >
            :
                | {
                    chain: `${TChain}.${TTypeName}`
                    arrayFields: ExtractArrayFields<TNestedFields>
                  }
                | DiscoverContainers<
                    TSchema,
                    TNestedFields,
                    `${TChain}.${TTypeName}`,
                    [{name: TTypeName; fields: TNestedFields}, ...TAncestors]
                  >
        : never
    : never

/**
 * @internal
 *
 * Discovers leaf types nested inside a field list. A leaf is a type that
 * appears as a member of an array but has no array fields of its own
 * (void block objects). Spans and inline objects are handled separately
 * at the top level via `AllLeaves`.
 *
 * Walks both inline declarations and bare references. References to
 * top-level void block-objects (no fields, or fields with no array fields)
 * become leaves at the current chain.
 */
type DiscoverLeaves<
  TSchema extends SchemaDefinition,
  TFields,
  TChain extends string,
  TAncestors extends ReadonlyArray<{name: string; fields: unknown}> = [],
> =
  WalkFields<TFields> extends infer TMembers
    ? TMembers extends {ref: infer TRefName extends string}
      ? AncestorHasName<TAncestors, TRefName> extends true
        ? never
        : ResolveReference<
              TSchema,
              TRefName,
              TAncestors
            > extends infer TRefFields
          ? TRefFields extends ReadonlyArray<unknown>
            ? ExtractArrayFields<TRefFields> extends never
              ? {type: TRefName; chain: TChain; parent: 'container'}
              : DiscoverLeaves<
                  TSchema,
                  TRefFields,
                  `${TChain}.${TRefName}`,
                  [{name: TRefName; fields: TRefFields}, ...TAncestors]
                >
            : // Block object with no fields at all → void leaf.
              {type: TRefName; chain: TChain; parent: 'container'}
          : never
      : TMembers extends {
            type: infer TTypeName extends string
            fields: infer TNestedFields
          }
        ? TTypeName extends 'block'
          ? never
          : ExtractArrayFields<TNestedFields> extends never
            ? {type: TTypeName; chain: TChain; parent: 'container'}
            : DiscoverLeaves<
                TSchema,
                TNestedFields,
                `${TChain}.${TTypeName}`,
                [{name: TTypeName; fields: TNestedFields}, ...TAncestors]
              >
        : never
    : never

/**
 * @internal
 *
 * All containers discoverable from a schema.
 *
 * Always includes `{chain: 'block', arrayFields: 'children'}` for root text
 * blocks. Additionally includes every top-level block object that has array
 * fields, plus every nested container type recursively.
 */
export type AllContainers<TSchema extends SchemaDefinition> =
  | {chain: 'block'; arrayFields: 'children'}
  | (TSchema['blockObjects'] extends ReadonlyArray<infer TBlockObject>
      ? TBlockObject extends {
          name: infer TName extends string
          fields?: infer TFields
        }
        ? ExtractArrayFields<TFields> extends never
          ? DiscoverContainers<
              TSchema,
              TFields,
              TName,
              [{name: TName; fields: TFields}]
            >
          :
              | {chain: TName; arrayFields: ExtractArrayFields<TFields>}
              | DiscoverContainers<
                  TSchema,
                  TFields,
                  TName,
                  [{name: TName; fields: TFields}]
                >
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
          : DiscoverLeaves<
              TSchema,
              TFields,
              TName,
              [{name: TName; fields: TFields}]
            >
        : never
      : never)

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
