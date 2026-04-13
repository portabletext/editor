import type {PortableTextBlock, SchemaDefinition} from '@portabletext/schema'
import type {ReactElement} from 'react'

/** @internal */
type ExtractArrayFields<TFields> = TFields extends readonly [
  infer TField,
  ...infer TRest,
]
  ? TField extends {name: infer TName extends string; type: 'array'}
    ? TName | ExtractArrayFields<TRest>
    : ExtractArrayFields<TRest>
  : never

/** @internal */
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

/** @internal */
type WalkFields<TFields> = TFields extends readonly [
  infer TField,
  ...infer TRest,
]
  ? TField extends {type: 'array'; of?: infer TOf}
    ? ExtractOfMembers<TOf> | WalkFields<TRest>
    : WalkFields<TRest>
  : never

/** @internal */
type CollectScopedTypes<TFields, TScope extends string> =
  WalkFields<TFields> extends infer TMembers
    ? TMembers extends {
        type: infer TTypeName extends string
        fields: infer TNestedFields
      }
      ? TTypeName extends 'block'
        ? {scopedName: `${TScope}.block`; arrayFields: 'children'}
        :
            | {
                scopedName: `${TScope}.${TTypeName}`
                arrayFields: ExtractArrayFields<TNestedFields>
              }
            | CollectScopedTypes<TNestedFields, `${TScope}.${TTypeName}`>
      : never
    : never

/**
 * Collect all renderer-eligible types from a schema definition.
 * Includes top-level block objects and all nested container types
/** @internal */
type CollectAllTypes<TSchema extends SchemaDefinition> =
  | {scopedName: 'block'; arrayFields: 'children'}
  | (TSchema['blockObjects'] extends ReadonlyArray<infer TBlockObject>
      ? TBlockObject extends {
          name: infer TName extends string
          fields?: infer TFields
        }
        ?
            | {scopedName: TName; arrayFields: ExtractArrayFields<TFields>}
            | CollectScopedTypes<TFields, TName>
        : never
      : never)

/** @internal */
type AllScopedNames<TSchema extends SchemaDefinition> =
  CollectAllTypes<TSchema> extends {scopedName: infer TName} ? TName : never

/** @internal */
type ScopedArrayFields<TSchema extends SchemaDefinition, TName extends string> =
  CollectAllTypes<TSchema> extends infer TEntry
    ? TEntry extends {scopedName: TName; arrayFields: infer TFieldName}
      ? TFieldName
      : never
    : never

// === Container ===

/** @internal */
type SchemaContainerConfig<TSchema extends SchemaDefinition> =
  AllScopedNames<TSchema> extends infer TType extends string
    ? TType extends TType
      ? {
          scope: TType
          field: ScopedArrayFields<TSchema, TType>
          render?: (props: {
            attributes: Record<string, unknown>
            children: ReactElement
            node: PortableTextBlock
          }) => ReactElement | null
        }
      : never
    : never

/**
 * @internal
 */
export type Container = {
  scope: string
  field: string
  render?: (props: {
    attributes: Record<string, unknown>
    children: ReactElement
    node: PortableTextBlock
  }) => ReactElement | null
}

/**
 * @internal
 *
 * Define a container for a block object type.
 *
 * When called with a schema type parameter, constrains `scope` to valid
 * scoped type names, `field` to array field names on that type, and
 * provides the `render` function signature:
 *
 * ```ts
 * defineContainer<typeof schema>({
 *   scope: 'table.row.cell',
 *   field: 'content',
 *   render: ({children}) => <td>{children}</td>,
 * })
 * ```
 *
 * Without a schema type parameter, accepts any string:
 *
 * ```ts
 * defineContainer({
 *   scope: 'callout',
 *   field: 'content',
 *   render: ({children}) => <div>{children}</div>,
 * })
 * ```
 */
export function defineContainer<TSchema extends SchemaDefinition>(
  config: SchemaContainerConfig<TSchema>,
): Container
export function defineContainer(config: Container): Container
export function defineContainer(config: Container): Container {
  return config
}

/**
 * @internal
 */
export type ContainerConfig = {
  container: Container
}
