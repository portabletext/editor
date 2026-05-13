import type {SchemaDefinition} from '@portabletext/schema'

/**
 * @internal
 *
 * Type-level helpers for narrowing `defineContainer`/`defineLeaf` calls
 * against a concrete schema. These enumerate the `_type` names a
 * container or leaf registration may target, the array field names on
 * a given container, and the child `_type`s valid in a given field.
 *
 * Operate purely on the schema's static shape. They don't model
 * position, since container/leaf registrations are keyed by `_type`
 * alone: positional variation is handled inside the renderer via
 * `parent`, `isInline`, and the container's `renderChild`.
 */

/**
 * @internal
 *
 * Names of array-typed fields on a field list. Used by
 * `ContainerField` to constrain `defineContainer`'s `childField` to a
 * valid array field on the target type.
 */
type ArrayFieldNames<TFields> = TFields extends readonly [
  infer TField,
  ...infer TRest,
]
  ? TField extends {name: infer TName extends string; type: 'array'}
    ? TName | ArrayFieldNames<TRest>
    : ArrayFieldNames<TRest>
  : never

/**
 * @internal
 *
 * Walk a schema for the named type's fields. Checks top-level
 * `blockObjects` first, then recurses into inline
 * `{type:'object', name, fields}` declarations. Mirrors
 * `findFieldsForType` in `resolve-containers.ts`.
 */
export type FindFieldsForType<
  TSchema extends SchemaDefinition,
  TName extends string,
> =
  FindAtTopLevel<TSchema, TName> extends infer TTopLevel
    ? [TTopLevel] extends [never]
      ? FindInline<TSchema['blockObjects'], TName, []>
      : TTopLevel
    : never

type FindAtTopLevel<TSchema extends SchemaDefinition, TName extends string> =
  TSchema['blockObjects'] extends ReadonlyArray<infer TBlockObject>
    ? TBlockObject extends {name: TName; fields: infer TFields}
      ? TFields
      : never
    : never

type FindInline<
  TBlockObjects,
  TTarget extends string,
  TAncestors extends ReadonlyArray<string>,
> =
  TBlockObjects extends ReadonlyArray<infer TBlockObject>
    ? TBlockObject extends {
        name: infer TName extends string
        fields: infer TFields
      }
      ? TName extends TAncestors[number]
        ? never
        : FindInlineInFields<TFields, TTarget, [TName, ...TAncestors]>
      : never
    : never

type FindInlineInFields<
  TFields,
  TTarget extends string,
  TAncestors extends ReadonlyArray<string>,
> = TFields extends readonly [infer THead, ...infer TRest]
  ? THead extends {type: 'array'; of?: infer TOf}
    ?
        | FindInlineInOf<TOf, TTarget, TAncestors>
        | FindInlineInFields<TRest, TTarget, TAncestors>
    : FindInlineInFields<TRest, TTarget, TAncestors>
  : never

type FindInlineInOf<
  TOf,
  TTarget extends string,
  TAncestors extends ReadonlyArray<string>,
> = TOf extends readonly [infer THead, ...infer TRest]
  ? THead extends {
      type: 'object'
      name: infer TName extends string
      fields: infer TFields
    }
    ? TName extends TTarget
      ? TFields
      :
          | (TName extends TAncestors[number]
              ? never
              : FindInlineInFields<TFields, TTarget, [TName, ...TAncestors]>)
          | FindInlineInOf<TRest, TTarget, TAncestors>
    : FindInlineInOf<TRest, TTarget, TAncestors>
  : never

/**
 * @internal
 *
 * Enumerate every `_type` name that has an editable array field
 * anywhere in the schema graph (i.e. every container type).
 *
 * Walks both inline `{type:'object', name:'X', fields:[...]}` declarations
 * and bare references resolved against the schema's `blockObjects`.
 * Cycle detection tracks names already on the current path; references
 * whose name matches an ancestor are not followed.
 *
 * Always includes `'block'`, since the text block is the universal
 * container for span / inline-object children.
 */
type WalkContainerTypes<
  TSchema extends SchemaDefinition,
  TFields,
  TAncestors extends ReadonlyArray<string> = [],
> = TFields extends readonly [infer TField, ...infer TRest]
  ? TField extends {type: 'array'; of?: infer TOf}
    ?
        | WalkOfForContainerTypes<TSchema, TOf, TAncestors>
        | WalkContainerTypes<TSchema, TRest, TAncestors>
    : WalkContainerTypes<TSchema, TRest, TAncestors>
  : never

type WalkOfForContainerTypes<
  TSchema extends SchemaDefinition,
  TOf,
  TAncestors extends ReadonlyArray<string>,
> = TOf extends readonly [infer TMember, ...infer TRest]
  ? TMember extends {
      type: 'object'
      name: infer TName extends string
      fields: infer TFields
    }
    ?
        | (ArrayFieldNames<TFields> extends never ? never : TName)
        | (TName extends TAncestors[number]
            ? never
            : WalkContainerTypes<TSchema, TFields, [TName, ...TAncestors]>)
        | WalkOfForContainerTypes<TSchema, TRest, TAncestors>
    : TMember extends {type: infer TRefName extends string}
      ? TRefName extends 'block' | 'string' | 'number' | 'boolean'
        ? WalkOfForContainerTypes<TSchema, TRest, TAncestors>
        : TRefName extends TAncestors[number]
          ?
              | (ArrayFieldNames<
                  FindFieldsForType<TSchema, TRefName>
                > extends never
                  ? never
                  : TRefName)
              | WalkOfForContainerTypes<TSchema, TRest, TAncestors>
          : FindFieldsForType<TSchema, TRefName> extends infer TRefFields
            ?
                | (ArrayFieldNames<TRefFields> extends never ? never : TRefName)
                | WalkContainerTypes<
                    TSchema,
                    TRefFields,
                    [TRefName, ...TAncestors]
                  >
                | WalkOfForContainerTypes<TSchema, TRest, TAncestors>
            : WalkOfForContainerTypes<TSchema, TRest, TAncestors>
      : WalkOfForContainerTypes<TSchema, TRest, TAncestors>
  : never

/**
 * @internal
 *
 * Walk a schema's `blockObjects` for top-level container types and
 * recurse into their fields. Returns the union of container type
 * names discoverable from the schema root.
 */
type DiscoverRootContainers<TSchema extends SchemaDefinition> =
  TSchema['blockObjects'] extends ReadonlyArray<infer TBlockObject>
    ? TBlockObject extends {
        name: infer TName extends string
        fields: infer TFields
      }
      ?
          | (ArrayFieldNames<TFields> extends never ? never : TName)
          | WalkContainerTypes<TSchema, TFields, [TName]>
      : never
    : never

/**
 * @internal
 *
 * Union of every `_type` name that may be passed to
 * `defineContainer({type})` for the given schema. Always includes
 * `'block'`.
 */
export type ContainerTypeName<TSchema extends SchemaDefinition> =
  | 'block'
  | DiscoverRootContainers<TSchema>

/**
 * @internal
 *
 * Array field names available on a container type. For `'block'`,
 * returns `'children'`. For other container types, walks the schema
 * (top-level + inline) and returns the array-typed field names on the
 * type's declaration.
 */
export type ContainerField<
  TSchema extends SchemaDefinition,
  TType extends string,
> = TType extends 'block'
  ? 'children'
  : ArrayFieldNames<FindFieldsForType<TSchema, TType>>

/**
 * @internal
 *
 * Alias for {@link ContainerField}. The prop is named `childField` in
 * {@link defineContainer}, so the schema-typed shape uses
 * `ContainerChildField<TSchema, TType>` for clarity.
 */
export type ContainerChildField<
  TSchema extends SchemaDefinition,
  TType extends string,
> = ContainerField<TSchema, TType>

/**
 * @internal
 *
 * Names of inline-object members on a `block` type, harvested by
 * walking nested type definitions. Used by `LeafTypeName` to include
 * inline objects declared inline anywhere in the schema.
 */
type WalkInlineObjectNames<TFields> = TFields extends readonly [
  infer TField,
  ...infer TRest,
]
  ? TField extends {type: 'array'; of?: infer TOf}
    ? WalkOfForInlineObjectNames<TOf> | WalkInlineObjectNames<TRest>
    : WalkInlineObjectNames<TRest>
  : never

type WalkOfForInlineObjectNames<TOf> = TOf extends readonly [
  infer TMember,
  ...infer TRest,
]
  ? TMember extends {
      type: 'block'
      inlineObjects?: infer TInlineObjects
    }
    ?
        | ExtractInlineObjectNames<TInlineObjects>
        | WalkOfForInlineObjectNames<TRest>
    : TMember extends {fields: infer TFields}
      ? WalkInlineObjectNames<TFields> | WalkOfForInlineObjectNames<TRest>
      : WalkOfForInlineObjectNames<TRest>
  : never

type ExtractInlineObjectNames<TInlineObjects> =
  TInlineObjects extends ReadonlyArray<infer TInlineObject>
    ? TInlineObject extends {name: infer TName extends string}
      ? TName
      : never
    : never

/**
 * @internal
 *
 * Union of every `_type` name that may be passed to
 * `defineLeaf({type})` for the given schema. Includes `'span'`, every
 * inline object's name, and every top-level block object's name
 * (block objects can be void leaves when they have no array field).
 */
export type LeafTypeName<TSchema extends SchemaDefinition> =
  | 'span'
  | ExtractInlineObjectNames<TSchema['inlineObjects']>
  | (TSchema['blockObjects'] extends ReadonlyArray<infer TBlockObject>
      ? TBlockObject extends {name: infer TName extends string}
        ? TName
        : never
      : never)
  | (TSchema['blockObjects'] extends ReadonlyArray<infer TBlockObject>
      ? TBlockObject extends {fields: infer TFields}
        ? WalkInlineObjectNames<TFields>
        : never
      : never)

/**
 * @internal
 *
 * Names of child `_type`s valid as direct members of a container's
 * field per the schema. Used by `defineContainer` to narrow
 * `renderChild` keys.
 *
 * For `block.children`: returns `'span'` union with every inline
 * object name (from `inlineObjects` and inline declarations).
 *
 * For other containers: walks the schema graph for the container's
 * field declaration and returns the union of member `_type` names
 * declared in its `of` array.
 */
export type ChildOfContainer<
  TSchema extends SchemaDefinition,
  TType extends string,
  TField extends string,
> = TType extends 'block'
  ? TField extends 'children'
    ? 'span' | ExtractInlineObjectNames<TSchema['inlineObjects']>
    : never
  : FindFieldsForType<TSchema, TType> extends infer TFields
    ? ResolveFieldChildren<TFields, TField>
    : never

type ResolveFieldChildren<
  TFields,
  TField extends string,
> = TFields extends readonly [infer THead, ...infer TRest]
  ? THead extends {name: TField; type: 'array'; of?: infer TOf}
    ? OfMemberTypeNames<TOf>
    : ResolveFieldChildren<TRest, TField>
  : never

type OfMemberTypeNames<TOf> = TOf extends readonly [
  infer TMember,
  ...infer TRest,
]
  ? TMember extends {type: 'object'; name: infer TName extends string}
    ? TName | OfMemberTypeNames<TRest>
    : TMember extends {type: infer TRefName extends string}
      ? TRefName | OfMemberTypeNames<TRest>
      : OfMemberTypeNames<TRest>
  : never
