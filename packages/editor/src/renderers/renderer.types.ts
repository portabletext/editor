import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  SchemaDefinition,
} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {RenderElementProps} from 'slate-react'
import type {EditorSnapshot} from '../editor/editor-snapshot'
import type {EditorPriority} from '../priority/priority.types'

/**
 * The default name for text blocks
 */
export const TEXT_BLOCK_NAME = 'block' as const

/**
 * @beta
 * The different types of renderers that can be registered
 *
 * - `block`: Renders block-level content. Use `name: 'block'` for text blocks,
 *   or a custom name for block objects (e.g., `name: 'image'`)
 * - `inline`: Renders inline content within a block. Use `name: 'span'` for text spans,
 *   or a custom name for inline objects (e.g., `name: 'stock-ticker'`)
 * - `decorator`: Renders text decorations (bold, italic, etc.)
 * - `annotation`: Renders annotations (links, comments, etc.)
 */
export type RendererType = 'block' | 'inline' | 'decorator' | 'annotation'

/**
 * @beta
 * Base render props shared by all renderer types
 */
export interface BaseRenderProps {
  /**
   * Slate attributes that must be spread on the root element
   */
  attributes: RenderElementProps['attributes']
  /**
   * Slate children - required for DOM tracking
   */
  children: ReactElement
  /**
   * Render the built-in default rendering
   */
  renderDefault: () => ReactElement
  /**
   * Render a minimal hidden element (for skipping rendering while maintaining Slate compatibility)
   */
  renderHidden: () => ReactElement
}

/**
 * @beta
 * Render props for text block renderers
 */
export interface TextBlockRenderProps extends BaseRenderProps {
  /**
   * The text block node being rendered
   */
  node: PortableTextTextBlock
}

/**
 * @beta
 * Render props for block object renderers
 */
export interface BlockObjectRenderProps<
  TNode extends PortableTextObject = PortableTextObject,
> extends BaseRenderProps {
  /**
   * The block object node being rendered
   */
  node: TNode
}

/**
 * @beta
 * Render props for span renderers
 */
export interface SpanRenderProps extends BaseRenderProps {
  /**
   * The span node being rendered (text content)
   */
  node: PortableTextSpan
}

/**
 * @beta
 * Render props for inline object renderers
 */
export interface InlineObjectRenderProps<
  TNode extends PortableTextObject = PortableTextObject,
> extends BaseRenderProps {
  /**
   * The inline object node being rendered
   */
  node: TNode
}

/**
 * @beta
 * Render props for inline renderers (spans and inline objects)
 */
export type InlineRenderProps<
  TNode extends PortableTextObject = PortableTextObject,
> = SpanRenderProps | InlineObjectRenderProps<TNode>

/**
 * @beta
 * Render props for decorator renderers
 */
export interface DecoratorRenderProps {
  /**
   * The decorator name (e.g., 'bold', 'italic', 'code')
   */
  node: string
  /**
   * The children to wrap
   */
  children: ReactElement
  /**
   * Render the built-in default rendering
   */
  renderDefault: () => ReactElement
}

/**
 * @beta
 * Render props for annotation renderers
 */
export interface AnnotationRenderProps<
  TNode extends PortableTextObject = PortableTextObject,
> {
  /**
   * The annotation object
   */
  node: TNode
  /**
   * The children to wrap
   */
  children: ReactElement
  /**
   * Render the built-in default rendering
   */
  renderDefault: () => ReactElement
}

/**
 * @beta
 * Maps renderer type to its corresponding render props
 */
export type RenderPropsMap = {
  block: TextBlockRenderProps | BlockObjectRenderProps
  inline: InlineRenderProps
  decorator: DecoratorRenderProps
  annotation: AnnotationRenderProps
}

/**
 * @beta
 * Props passed to a renderer guard function
 */
export interface RendererGuardProps<TNode = unknown> {
  /**
   * The node being rendered
   */
  node: TNode
  /**
   * The current editor snapshot
   */
  snapshot: EditorSnapshot
}

/**
 * @beta
 * A renderer guard function that determines if the renderer should handle the node.
 * Return `false` to skip this renderer and try the next one.
 * Return `true` or an object to handle the node (value is passed to render).
 */
export type RendererGuard<TNode = unknown, TGuardResponse = unknown> = (
  props: RendererGuardProps<TNode>,
) => TGuardResponse

/**
 * @beta
 * Base renderer type for storage in collections (accepts any render props)
 */
export interface RendererBase {
  type: RendererType
  name: string
  guard?: RendererGuard<any, any>
  render: (props: any, guardResponse: any) => ReactElement
}

/**
 * @beta
 * Resolves the node type for guard props based on renderer type and schema
 */
export type ResolveGuardNode<
  TSchema extends SchemaDefinition,
  TType extends RendererType,
  TName extends string,
> = TType extends 'block'
  ? TName extends 'block'
    ? PortableTextTextBlock
    : ResolveBlockObjectType<TSchema, TName>
  : TType extends 'inline'
    ? TName extends 'span'
      ? PortableTextSpan
      : ResolveInlineObjectType<TSchema, TName>
    : TType extends 'decorator'
      ? string
      : TType extends 'annotation'
        ? ResolveAnnotationType<TSchema, TName>
        : unknown

/**
 * @beta
 * A renderer configuration with full type inference.
 * Use the guard function to conditionally handle nodes - return false to skip,
 * or return a value (including true) to handle the node.
 */
export type Renderer<
  TSchema extends SchemaDefinition = SchemaDefinition,
  TType extends RendererType = RendererType,
  TName extends string = string,
  TGuardResponse = true,
> = {
  /**
   * The type of node this renderer handles
   */
  type: TType
  /**
   * The name of the specific schema type to render.
   * For block renderers:
   * - Use `'block'` for text blocks
   * - Use a custom name for block objects (e.g., `'image'`)
   */
  name: TName
  /**
   * Optional guard function that determines if this renderer should handle the node.
   * Return `false` to skip and try the next renderer.
   * Return `true` or an object to handle (object is passed to render).
   */
  guard?: (
    props: RendererGuardProps<ResolveGuardNode<TSchema, TType, TName>>,
  ) => TGuardResponse | false
  /**
   * The render function
   * @param props - The render props for this renderer type
   * @param guardResponse - The value returned by the guard (or `true` if no guard)
   */
  render: (
    props: ResolveRenderProps<TSchema, TType, TName>,
    guardResponse: TGuardResponse,
  ) => ReactElement
}

/**
 * @beta
 * Resolves the render props type based on the renderer type and schema
 */
export type ResolveRenderProps<
  TSchema extends SchemaDefinition,
  TType extends RendererType,
  TName extends string,
> = TType extends 'block'
  ? ResolveBlockRenderProps<TSchema, TName>
  : TType extends 'inline'
    ? ResolveInlineRenderProps<TSchema, TName>
    : TType extends 'decorator'
      ? DecoratorRenderProps
      : TType extends 'annotation'
        ? AnnotationRenderProps<ResolveAnnotationType<TSchema, TName>>
        : never

/**
 * @beta
 * Resolves the block render props - either text block or block object based on name.
 * When name is 'block', it's always a text block (no schema needed for inference).
 */
export type ResolveBlockRenderProps<
  TSchema extends SchemaDefinition,
  TName extends string,
> = TName extends 'block'
  ? TextBlockRenderProps
  : BlockObjectRenderProps<ResolveBlockObjectType<TSchema, TName>>

/**
 * @beta
 * Resolves the inline render props - either span or inline object based on name.
 * When name is 'span', it's a text span. Otherwise, it's an inline object.
 */
export type ResolveInlineRenderProps<
  TSchema extends SchemaDefinition,
  TName extends string,
> = TName extends 'span'
  ? SpanRenderProps
  : InlineObjectRenderProps<ResolveInlineObjectType<TSchema, TName>>

/**
 * @beta
 * Maps schema field types to TypeScript types
 */
export type FieldTypeMap = {
  string: string
  number: number
  boolean: boolean
  array: unknown[]
  object: Record<string, unknown>
}

/**
 * @beta
 * Extracts the TypeScript type for a single field definition
 */
export type FieldToType<TField> = TField extends {
  name: infer TFieldName extends string
  type: infer TFieldType extends keyof FieldTypeMap
}
  ? {[K in TFieldName]: FieldTypeMap[TFieldType]}
  : object

/**
 * @beta
 * Converts an array of field definitions to a TypeScript object type
 */
export type FieldsToObject<TFields> = TFields extends readonly [
  infer TFirst,
  ...infer TRest,
]
  ? FieldToType<TFirst> & FieldsToObject<TRest>
  : object

/**
 * @beta
 * Finds an object definition by name in an array
 */
export type FindByName<TArray, TName extends string> = TArray extends readonly [
  infer TFirst,
  ...infer TRest,
]
  ? TFirst extends {name: TName}
    ? TFirst
    : FindByName<TRest, TName>
  : never

/**
 * @beta
 * Resolves the block object type from the schema based on the name
 */
export type ResolveBlockObjectType<
  TSchema extends SchemaDefinition,
  TName extends string,
> = TSchema extends {
  blockObjects: infer TBlockObjects extends readonly unknown[]
}
  ? FindByName<TBlockObjects, TName> extends {
      name: TName
      fields?: infer TFields
    }
    ? PortableTextObject & {_type: TName} & FieldsToObject<TFields>
    : PortableTextObject
  : PortableTextObject

/**
 * @beta
 * Resolves the inline object type from the schema based on the name
 */
export type ResolveInlineObjectType<
  TSchema extends SchemaDefinition,
  TName extends string,
> = TSchema extends {
  inlineObjects: infer TInlineObjects extends readonly unknown[]
}
  ? FindByName<TInlineObjects, TName> extends {
      name: TName
      fields?: infer TFields
    }
    ? PortableTextObject & {_type: TName} & FieldsToObject<TFields>
    : PortableTextObject
  : PortableTextObject

/**
 * @beta
 * Resolves the annotation type from the schema based on the name
 */
export type ResolveAnnotationType<
  TSchema extends SchemaDefinition,
  TName extends string,
> = TSchema extends {
  annotations: infer TAnnotations extends readonly unknown[]
}
  ? FindByName<TAnnotations, TName> extends {
      name: TName
      fields?: infer TFields
    }
    ? PortableTextObject & {_type: TName} & FieldsToObject<TFields>
    : PortableTextObject
  : PortableTextObject

/**
 * @beta
 * Internal renderer configuration with priority
 */
export type RendererConfig = {
  renderer: RendererBase
  priority: EditorPriority
}

/**
 * Creates a unique key for a renderer based on its type and name.
 * Used for O(1) lookups in the renderer Map.
 */
export function getRendererKey(type: RendererType, name: string): string {
  return `${type}:${name}`
}
