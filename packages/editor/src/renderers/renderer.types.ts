import type {PortableTextBlock, SchemaDefinition} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {ChildArrayField} from '../schema/resolve-containers'
import type {ParsedScope} from '../scope/parse-scope'
import type {AllContainers, ContainerScope} from '../scope/scope.types'

/**
 * @alpha
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
 * Terminal (last dot-separated) segment of a chain.
 *
 * `'table.row.cell'` → `'cell'`, `'cell'` → `'cell'`.
 */
type TerminalSegment<TChain extends string> =
  TChain extends `${string}.${infer TRest}` ? TerminalSegment<TRest> : TChain

/**
 * Terminal type name of a scope string, stripping the `$.` or `$..` anchor.
 */
type TerminalType<TScope extends string> = TScope extends `$.${infer TRest}`
  ? TerminalSegment<TRest>
  : TScope extends `$..${infer TRest}`
    ? TerminalSegment<TRest>
    : never

/**
 * Array field names available on the terminal type of a scope.
 */
type ScopedArrayFields<
  TSchema extends SchemaDefinition,
  TScope extends string,
> =
  TerminalType<TScope> extends infer TTerminal extends string
    ? AllContainers<TSchema> extends infer TEntry
      ? TEntry extends {
          chain: infer TChain extends string
          arrayFields: infer TFields
        }
        ? TerminalSegment<TChain> extends TTerminal
          ? TFields
          : never
        : never
      : never
    : never

/**
 * @internal
 *
 * Schema-constrained container config. `scope` is narrowed to valid JSONPath
 * container scopes; `field` is narrowed to the array field names on the
 * scope's terminal type.
 */
type SchemaContainerConfig<TSchema extends SchemaDefinition> =
  // Only activate the narrowed shape when the caller provides a concrete
  // schema. With the default `SchemaDefinition`, collapse to never so the
  // overload falls through to the plain `Container` signature.
  SchemaDefinition extends TSchema
    ? never
    : ContainerScope<TSchema> extends infer TScope
      ? TScope extends string
        ? {
            scope: TScope
            field: ScopedArrayFields<TSchema, TScope>
            render?: (props: {
              attributes: Record<string, unknown>
              children: ReactElement
              node: PortableTextBlock
            }) => ReactElement | null
          }
        : never
      : never

/**
 * @alpha
 *
 * Define a container.
 *
 * With a schema type parameter, `scope` is constrained to valid JSONPath
 * container scopes, and `field` is constrained to the array field names on
 * the scope's terminal type:
 *
 * ```ts
 * defineContainer<typeof schema>({
 *   scope: '$..table.row.cell',
 *   field: 'content',
 *   render: ({children}) => <td>{children}</td>,
 * })
 * ```
 *
 * Without a schema type parameter, accepts any string.
 */
export function defineContainer<TSchema extends SchemaDefinition>(
  config: SchemaContainerConfig<TSchema>,
): Container
/**
 * @alpha
 */
export function defineContainer(config: Container): Container
export function defineContainer(config: Container): Container {
  return config
}

/**
 * @internal
 */
export type ContainerConfig = {
  container: Container
  parsedScope: ParsedScope
  field: ChildArrayField
}
