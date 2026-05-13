import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  SchemaDefinition,
} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {ChildArrayField} from '../schema/resolve-containers'
import type {Path} from '../slate/interfaces/path'
import type {
  ChildOfContainer,
  ContainerChildField,
  ContainerTypeName,
  LeafTypeName,
} from './schema-types'

/**
 * Render props shared by container and leaf renderers. The engine
 * derives `parent` and `isInline` from path context at render time.
 *
 * - `parent` is the immediate parent node, or `undefined` at the root.
 *   Use `parent?._type` to branch on positional context. Reach into
 *   `parent` directly for ancestor-driven rendering decisions (e.g. a
 *   list-item reading its list's `kind`).
 *
 * - `isInline` is `true` when the node sits inside a text block's
 *   `children` array alongside spans (the inline-object position). It
 *   is `false` for block-level positions (root-of-array, container
 *   field). Matches the `isInline` discriminator that
 *   `@portabletext/react` and `@portabletext/to-html` pass to their
 *   custom-type components.
 */
type CommonRenderProps = {
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  isInline: boolean
  parent: PortableTextBlock | PortableTextObject | undefined
  path: Path
  readOnly: boolean
  selected: boolean
}

/**
 * @alpha
 *
 * Render function for a node when it appears as a direct child of a
 * container. Used as the value type of `ContainerDefinition.renderChild`.
 */
export type ChildRender = (
  props: CommonRenderProps & {
    node: PortableTextBlock | PortableTextSpan | PortableTextObject
  },
) => ReactElement | null

/**
 * @alpha
 *
 * Definition of a container registration. Containers expose an editable
 * array field on a node, and optionally render the wrapping element
 * around their children. They may also declare per-child-type renders
 * that take precedence over global `defineContainer` / `defineLeaf`
 * registrations for direct children of this container.
 *
 * - `type` is the `_type` of the container node. One registration per
 *   type; later registrations of the same type are ignored with a
 *   warning.
 *
 * - `childField` is the array field on the type that holds editable
 *   children. Resolved against the schema at registration time.
 *
 * - `render` receives positional context as props (`parent`, `isInline`)
 *   and may branch internally on them.
 *
 * - `renderChild` is an optional record keyed by child `_type`. When
 *   the engine renders a direct child of this container whose `_type`
 *   matches a key, the keyed render is used in preference to any global
 *   `defineContainer` or `defineLeaf` registration. Opt-in per child
 *   type; child types not listed fall through to the global registration
 *   chain. Direct-child only; not consulted for grand-descendants.
 */
export type ContainerDefinition = {
  type: string
  childField: string
  render?: (
    props: CommonRenderProps & {
      node: PortableTextBlock | PortableTextObject
    },
  ) => ReactElement | null
  renderChild?: Record<string, ChildRender>
}

/**
 * Schema-typed shape of `ContainerDefinition`. `type` is narrowed to a
 * registered container type name on the schema; `childField` is narrowed
 * to the array field names on that type; `renderChild` keys are narrowed
 * to the child `_type` names valid in `childField` per the schema.
 *
 * @internal
 */
type SchemaContainerDefinition<TSchema extends SchemaDefinition> =
  SchemaDefinition extends TSchema
    ? never
    : ContainerTypeName<TSchema> extends infer TType
      ? TType extends string
        ? ContainerChildField<TSchema, TType> extends infer TChildField
          ? TChildField extends string
            ? {
                type: TType
                childField: TChildField
                render?: (
                  props: CommonRenderProps & {
                    node: TType extends 'block'
                      ? PortableTextTextBlock
                      : PortableTextObject
                  },
                ) => ReactElement | null
                renderChild?: Partial<
                  Record<
                    ChildOfContainer<TSchema, TType, TChildField>,
                    ChildRender
                  >
                >
              }
            : never
          : never
        : never
      : never

/**
 * @alpha
 *
 * Define a container.
 *
 * With a schema type parameter, `type` is constrained to registered
 * container type names on the schema, `childField` is constrained to
 * the array field names on that type, and `renderChild` keys are
 * constrained to the child types valid in that field per the schema:
 *
 * ```ts
 * defineContainer<typeof schema>({
 *   type: 'callout',
 *   childField: 'content',
 *   render: ({attributes, children}) => <aside {...attributes}>{children}</aside>,
 *   renderChild: {
 *     image: ({attributes, children, node}) => (
 *       <span {...attributes}>compact callout image</span>
 *     ),
 *   },
 * })
 * ```
 *
 * Without a schema type parameter, accepts any string for `type` and
 * `childField`, and any string keys on `renderChild`.
 */
export function defineContainer<TSchema extends SchemaDefinition>(
  config: SchemaContainerDefinition<TSchema>,
): ContainerDefinition
/**
 * @alpha
 */
export function defineContainer(
  config: ContainerDefinition,
): ContainerDefinition
export function defineContainer(
  config: ContainerDefinition,
): ContainerDefinition {
  return config
}

/**
 * @internal
 */
export type ContainerConfig = {
  container: ContainerDefinition
  field: ChildArrayField
}

/**
 * @alpha
 *
 * Definition of a leaf registration. Leaves render spans, inline
 * objects, and void block objects. One registration per type; later
 * registrations of the same type are ignored with a warning.
 *
 * The render function must always render `children` somewhere inside
 * the outer element. For spans, `children` carries the styled text. For
 * inline objects and void block objects, `children` carries an
 * engine-emitted void spacer the browser uses to anchor the caret next
 * to the element. Dropping `children` makes the caret unable to land on
 * the element.
 *
 * `parent` and `isInline` are passed as positional context. For an
 * inline image (in a text block's children), `isInline` is `true` and
 * `parent` is the text block. For a void block-object image (root
 * position), `isInline` is `false` and `parent` is either undefined
 * (root) or the enclosing container.
 */
export type Leaf = {
  type: string
  render: (
    props: CommonRenderProps & {
      node: PortableTextBlock | PortableTextSpan | PortableTextObject
    },
  ) => ReactElement | null
}

/**
 * Schema-typed shape of `Leaf`. `type` is narrowed to a registered
 * leaf type name on the schema (spans, inline objects, void block
 * objects).
 *
 * @internal
 */
type SchemaLeaf<TSchema extends SchemaDefinition> =
  SchemaDefinition extends TSchema
    ? never
    : LeafTypeName<TSchema> extends infer TType
      ? TType extends string
        ? {
            type: TType
            render: (
              props: CommonRenderProps & {
                node: TType extends 'span'
                  ? PortableTextSpan
                  : PortableTextObject
              },
            ) => ReactElement | null
          }
        : never
      : never

/**
 * @alpha
 *
 * Define a leaf renderer for a span, inline object, or void block
 * object.
 *
 * With a schema type parameter, `type` is constrained to registered
 * leaf type names on the schema:
 *
 * ```ts
 * defineLeaf<typeof schema>({
 *   type: 'image',
 *   render: ({attributes, children, isInline}) => (
 *     <span {...attributes}>{children}{isInline ? <img/> : <figure><img/></figure>}</span>
 *   ),
 * })
 * ```
 *
 * Without a schema type parameter, accepts any string for `type`.
 */
export function defineLeaf<TSchema extends SchemaDefinition>(
  config: SchemaLeaf<TSchema>,
): Leaf
/**
 * @alpha
 */
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
