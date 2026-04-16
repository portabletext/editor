import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  SchemaDefinition,
} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {Path} from '../slate/interfaces/path'

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
            path: Path
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
    path: Path
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

// === Leaf ===

/** @internal */
type TextBlockScopes<TSchema extends SchemaDefinition> =
  CollectAllTypes<TSchema> extends infer TEntry
    ? TEntry extends {
        scopedName: infer TName extends string
        arrayFields: 'children'
      }
      ? TName
      : never
    : never

/** @internal */
type InlineObjectNames<TSchema extends SchemaDefinition> =
  TSchema['inlineObjects'] extends ReadonlyArray<infer TInline>
    ? TInline extends {name: infer TName extends string}
      ? TName
      : never
    : never

/** @internal */
type TextBlockLeafScopes<TSchema extends SchemaDefinition> =
  TextBlockScopes<TSchema> extends infer TScope extends string
    ? `${TScope}.span` | `${TScope}.${InlineObjectNames<TSchema>}`
    : never

/** @internal */
type CollectVoidLeafScopes<TFields, TScope extends string> =
  WalkFields<TFields> extends infer TMembers
    ? TMembers extends {
        type: infer TTypeName extends string
        fields: infer TNestedFields
      }
      ? TTypeName extends 'block'
        ? never
        : ExtractArrayFields<TNestedFields> extends never
          ? `${TScope}.${TTypeName}`
          : CollectVoidLeafScopes<TNestedFields, `${TScope}.${TTypeName}`>
      : TMembers extends {type: infer TTypeName extends string}
        ? `${TScope}.${TTypeName}`
        : never
    : never

/** @internal */
type AllVoidLeafScopes<TSchema extends SchemaDefinition> =
  TSchema['blockObjects'] extends ReadonlyArray<infer TBlockObject>
    ? TBlockObject extends {
        name: infer TName extends string
        fields?: infer TFields
      }
      ? CollectVoidLeafScopes<TFields, TName>
      : never
    : never

/** @internal */
type VoidBlockObjectNames<TSchema extends SchemaDefinition> =
  TSchema['blockObjects'] extends ReadonlyArray<infer TBlockObject>
    ? TBlockObject extends {
        name: infer TName extends string
        fields?: infer TFields
      }
      ? ExtractArrayFields<TFields> extends never
        ? TName
        : never
      : TBlockObject extends {name: infer TName extends string}
        ? TName
        : never
    : never

/** @internal */
type AllLeafScopedNames<TSchema extends SchemaDefinition> =
  | 'span'
  | InlineObjectNames<TSchema>
  | VoidBlockObjectNames<TSchema>
  | TextBlockLeafScopes<TSchema>
  | AllVoidLeafScopes<TSchema>

/** @internal */
type SchemaLeafConfig<TSchema extends SchemaDefinition> =
  AllLeafScopedNames<TSchema> extends infer TScope extends string
    ? TScope extends TScope
      ? {
          scope: TScope
          render: (props: {
            attributes: Record<string, unknown>
            children: ReactElement
            node: PortableTextBlock | PortableTextSpan | PortableTextObject
            path: Path
          }) => ReactElement | null
        }
      : never
    : never

/**
 * @internal
 */
export type Leaf = {
  scope: string
  render: (props: {
    attributes: Record<string, unknown>
    children: ReactElement
    node: PortableTextBlock | PortableTextSpan | PortableTextObject
    path: Path
  }) => ReactElement | null
}

/**
 * @internal
 *
 * Define a leaf renderer for a non-container node type (spans, inline objects,
 * block objects).
 *
 * When called with a schema type parameter, constrains `scope` to valid
 * leaf scoped names:
 *
 * ```ts
 * defineLeaf<typeof schema>({
 *   scope: 'callout.block.span',
 *   render: ({attributes, children}) => <span {...attributes}>{children}</span>,
 * })
 * ```
 *
 * Without a schema type parameter, accepts any string:
 *
 * ```ts
 * defineLeaf({
 *   scope: 'block.span',
 *   render: ({attributes, children}) => <span {...attributes}>{children}</span>,
 * })
 * ```
 */
export function defineLeaf<TSchema extends SchemaDefinition>(
  config: SchemaLeafConfig<TSchema>,
): Leaf
export function defineLeaf(config: Leaf): Leaf
export function defineLeaf(config: Leaf): Leaf {
  return config
}

/**
 * @internal
 */
export type LeafConfig = {
  leaf: Leaf
}
