import type {PortableTextBlock, SchemaDefinition} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {Container} from './renderer.types'

/** @beta */
export type ExtractArrayFields<TFields> = TFields extends readonly [
  infer TField,
  ...infer TRest,
]
  ? TField extends {name: infer TName extends string; type: 'array'}
    ? TName | ExtractArrayFields<TRest>
    : ExtractArrayFields<TRest>
  : never

/** @beta */
export type ExtractOfMembers<TOfMembers> = TOfMembers extends readonly [
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

/** @beta */
export type WalkFields<TFields> = TFields extends readonly [
  infer TField,
  ...infer TRest,
]
  ? TField extends {type: 'array'; of?: infer TOf}
    ? ExtractOfMembers<TOf> | WalkFields<TRest>
    : WalkFields<TRest>
  : never

/** @beta */
export type CollectScopedTypes<TFields, TScope extends string> =
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

/** @beta */
export type CollectAllTypes<TSchema extends SchemaDefinition> =
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

/** @beta */
export type AllScopedNames<TSchema extends SchemaDefinition> =
  CollectAllTypes<TSchema> extends {scopedName: infer TName} ? TName : never

/** @beta */
export type ScopedArrayFields<
  TSchema extends SchemaDefinition,
  TName extends string,
> =
  CollectAllTypes<TSchema> extends infer TEntry
    ? TEntry extends {scopedName: TName; arrayFields: infer TFieldName}
      ? TFieldName
      : never
    : never

/** @beta */
export type SchemaContainerConfig<TSchema extends SchemaDefinition> =
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
 * @beta
 *
 * Define a container for a block object type.
 *
 * A container is a block object with an array field that holds children.
 * Each container declares its `scope` (where it lives in the schema tree),
 * `field` (which array field holds children), and optionally a `render`
 * function.
 *
 * When called with a schema type parameter, constrains `scope` to valid
 * scoped type names and `field` to array field names on that type.
 */
export function defineContainer<TSchema extends SchemaDefinition>(
  config: SchemaContainerConfig<TSchema>,
): Container
/**
 * @beta
 */
export function defineContainer(config: Container): Container
export function defineContainer(config: Container): Container {
  return config
}
