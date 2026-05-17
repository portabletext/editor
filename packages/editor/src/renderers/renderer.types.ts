import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {ChildArrayField} from '../schema/resolve-containers'
import type {Path} from '../slate/interfaces/path'

/**
 * @alpha
 *
 * Narrow the container node type by the registered `_type`. Containers
 * always render portable text objects: `'span'` is always a leaf and
 * `'block'` is always a text block; both are excluded.
 */
export type ContainerNodeForType<TType extends string> = TType extends
  | 'span'
  | 'block'
  ? never
  : PortableTextObject

/**
 * @alpha
 *
 * A container's render function receives a node and renders an element
 * that wraps its editable children. The render is positional: it fires for
 * nodes of `type` whose parent permits this container at `arrayField`.
 *
 * `node` is `PortableTextObject` because containers cannot register the
 * built-in `'span'` or `'block'` types (those are leaves and text blocks
 * respectively).
 */
export type ContainerRender = (props: {
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  node: PortableTextObject
  path: Path
  readOnly: boolean
  selected: boolean
}) => ReactElement | null

/**
 * @alpha
 *
 * A span's render function. Receives a portable text span node and
 * wraps it. `children` carries the styled text already decorated by
 * `renderDecorator`/`renderAnnotation`/range decorations.
 */
export type SpanRender = (props: {
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  node: PortableTextSpan
  path: Path
  readOnly: boolean
  selected: boolean
}) => ReactElement | null

/**
 * @alpha
 *
 * A block object's render function. Receives a non-editable block-level
 * portable text object. `children` carries an engine-emitted void
 * spacer that the browser uses to anchor the caret next to the
 * element. Dropping `children` makes the caret unable to land on the
 * element.
 */
export type BlockObjectRender = (props: {
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  node: PortableTextObject
  path: Path
  readOnly: boolean
  selected: boolean
}) => ReactElement | null

/**
 * @alpha
 *
 * An inline object's render function. Receives a non-editable inline
 * portable text object. `children` carries an engine-emitted void
 * spacer that the browser uses to anchor the caret next to the
 * element. Dropping `children` makes the caret unable to land on the
 * element.
 */
export type InlineObjectRender = (props: {
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  node: PortableTextObject
  path: Path
  readOnly: boolean
  selected: boolean
}) => ReactElement | null

/**
 * @alpha
 *
 * A container registration. Identifies a block object `_type` whose value
 * holds editable children in `arrayField`. The optional `of` array carries
 * nested registrations that override how immediate children of this
 * container render at this lexical scope.
 *
 * `of` overrides apply ONE level down only. Children at deeper levels fall
 * through to global registrations.
 *
 * The `kind` field is injected by `defineContainer` and discriminates
 * containers from other registration kinds at runtime.
 */
export type Container = {
  kind: 'container'
  type: string
  arrayField: string
  /**
   * Outer render. Three modes:
   * - omitted: fall through to global registered render (or engine default)
   * - `null`: skip global, use engine default at this position
   * - function: use this render
   */
  render?: ContainerRender | null
  /**
   * Block-level positional overrides. Inline-content kinds (`Span`,
   * `InlineObject`) belong in `TextBlock.of`, not here.
   */
  of?: ReadonlyArray<Container | TextBlock | BlockObject>
}

/**
 * @alpha
 *
 * A text block registration. The text block `_type` is `'block'` at the
 * top level. Positional overrides nested in a container's `of` array can
 * register a different `_type` to render at that lexical scope.
 *
 * `defineTextBlock` opts the text block into the new render pipeline.
 * The consumer's `render` callback owns the outer wrapper entirely:
 * the engine emits `data-pt-*` attributes only - no `pt-*` CSS classes,
 * no legacy `data-block-*` attributes - and the block-level
 * `renderStyle`/`renderListItem`/`renderBlock` props on
 * `<PortableTextEditable>` do not compose under this registration.
 *
 * Span-level render props - `renderDecorator`, `renderAnnotation`,
 * `renderPlaceholder`, and range decorations - keep working. They fire
 * on the spans inside `children` regardless of which text block outer
 * wrapper renders them.
 */
export type TextBlock = {
  kind: 'textBlock'
  type: string
  /**
   * Outer render. Three modes:
   * - omitted: fall through to global registered render (or engine default)
   * - `null`: skip global, use engine default at this position
   * - function: use this render
   */
  render?: TextBlockRender | null
  /**
   * Inline-content positional overrides. A `Span` or `InlineObject`
   * placed here scopes the inline render to this text block (or any
   * text block of this `type` if registered at the top level).
   */
  of?: ReadonlyArray<Span | InlineObject>
}

/**
 * @alpha
 *
 * Text block render function. `children` carries the rendered spans -
 * `renderDecorator`, `renderAnnotation`, `renderPlaceholder`, and range
 * decorations have already fired at the leaf level. The render's job
 * is the outer wrapper element and any block-level composition (style,
 * list-item) the consumer wants.
 */
export type TextBlockRender = (props: {
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  node: PortableTextTextBlock
  path: Path
  readOnly: boolean
  selected: boolean
}) => ReactElement | null

/**
 * @alpha
 *
 * A span registration. The span `_type` is `'span'` at the top level.
 * Positional overrides nested in a container's `of` array can register
 * a different `_type` for a span-like inline at that lexical scope
 * (e.g. a `code-span` inside a `code-block`).
 */
export type Span = {
  kind: 'span'
  type: string
  /**
   * Outer render. Three modes:
   * - omitted: fall through to global registered render (or engine default)
   * - `null`: skip global, use engine default at this position
   * - function: use this render
   */
  render?: SpanRender | null
}

/**
 * @alpha
 *
 * A non-editable block-level object registration. Identifies a `_type`
 * whose value renders as a block-level void node (image, embed, etc.).
 */
export type BlockObject = {
  kind: 'blockObject'
  type: string
  /**
   * Outer render. Three modes:
   * - omitted: fall through to global registered render (or engine default)
   * - `null`: skip global, use engine default at this position
   * - function: use this render
   */
  render?: BlockObjectRender | null
}

/**
 * @alpha
 *
 * A non-editable inline object registration. Identifies a `_type` whose
 * value renders as an inline void node (mention, inline image, etc.).
 */
export type InlineObject = {
  kind: 'inlineObject'
  type: string
  /**
   * Outer render. Three modes:
   * - omitted: fall through to global registered render (or engine default)
   * - `null`: skip global, use engine default at this position
   * - function: use this render
   */
  render?: InlineObjectRender | null
}

/**
 * @alpha
 *
 * The discriminated union of every registration accepted by
 * `editor.registerNode` and the `<NodePlugin>` component.
 */
export type RegistrableNode =
  | Container
  | TextBlock
  | Span
  | BlockObject
  | InlineObject

/**
 * @alpha
 *
 * Define a container renderer. The returned registration is mounted via
 * the `<NodePlugin>` component at the top level, or nested inside
 * another container's `of` array as a positional override.
 *
 * `type` cannot be `'span'` (use {@link defineSpan}) nor `'block'` (use
 * {@link defineTextBlock}). The text block is not a container.
 *
 * The `node` argument of `render` narrows to a portable text object.
 *
 * @example
 * ```ts
 * defineContainer({
 *   type: 'table',
 *   arrayField: 'rows',
 *   render: ({children}) => (
 *     <table>{children}</table>
 *   ),
 *   of: [
 *     defineContainer({
 *       type: 'row',
 *       arrayField: 'cells',
 *       render: ({children}) => (
 *         <tr>{children}</tr>
 *       ),
 *     }),
 *   ],
 * })
 * ```
 */
export function defineContainer<const TType extends string>(config: {
  type: TType extends 'span'
    ? "Error: defineContainer({type: 'span'}) is forbidden -- 'span' is always a span, use defineSpan"
    : TType extends 'block'
      ? "Error: defineContainer({type: 'block'}) is forbidden -- 'block' is always a text block, use defineTextBlock"
      : TType
  arrayField: string
  render?:
    | ((props: {
        attributes: Record<string, unknown>
        children: ReactElement
        focused: boolean
        node: ContainerNodeForType<TType>
        path: Path
        readOnly: boolean
        selected: boolean
      }) => ReactElement | null)
    | null
  of?: ReadonlyArray<Container | TextBlock | BlockObject>
}): Container {
  return {kind: 'container', ...config} as unknown as Container
}

/**
 * @alpha
 *
 * Define a span renderer. The returned registration is mounted via the
 * `<NodePlugin>` component at the top level, or nested inside a
 * container's `of` array as a positional override.
 *
 * `type` is required even though there is only one top-level span type
 * (`'span'`) today. Keeping `type` required leaves the door open for
 * positional overrides of span-like inlines (e.g. a `code-span` inside
 * a `code-block` container).
 *
 * @example
 * ```ts
 * defineSpan({
 *   type: 'span',
 *   render: ({attributes, children}) => (
 *     <span {...attributes}>{children}</span>
 *   ),
 * })
 * ```
 */
export function defineSpan<const TType extends string>(config: {
  type: TType extends 'block'
    ? "Error: defineSpan({type: 'block'}) is forbidden -- 'block' is always a text block, use defineTextBlock"
    : TType
  render?: SpanRender | null
}): Span {
  return {kind: 'span', ...config} as unknown as Span
}

/**
 * @alpha
 *
 * Define a non-editable block-level object renderer for a `_type`
 * declared in the schema's `blockObjects` array.
 *
 * The render must always render `children` somewhere inside the outer
 * element. `children` carries an engine-emitted void spacer the browser
 * uses to anchor the caret next to the element. Dropping `children`
 * makes the caret unable to land on the element.
 *
 * @example
 * ```ts
 * defineBlockObject({
 *   type: 'image',
 *   render: ({attributes, children, node}) => (
 *     <div {...attributes}>
 *       {children}
 *       <img src={(node as {src?: string}).src} />
 *     </div>
 *   ),
 * })
 * ```
 */
export function defineBlockObject<const TType extends string>(config: {
  type: TType extends 'block'
    ? "Error: defineBlockObject({type: 'block'}) is forbidden -- 'block' is always a text block, use defineTextBlock"
    : TType extends 'span'
      ? "Error: defineBlockObject({type: 'span'}) is forbidden -- 'span' is always a span, use defineSpan"
      : TType
  render?: BlockObjectRender | null
}): BlockObject {
  return {kind: 'blockObject', ...config} as unknown as BlockObject
}

/**
 * @alpha
 *
 * Define a non-editable inline object renderer for a `_type` declared
 * in the schema's `inlineObjects` array.
 *
 * The render must always render `children` somewhere inside the outer
 * element. `children` carries an engine-emitted void spacer the browser
 * uses to anchor the caret next to the element. Dropping `children`
 * makes the caret unable to land on the element.
 *
 * @example
 * ```ts
 * defineInlineObject({
 *   type: 'mention',
 *   render: ({attributes, children, node}) => (
 *     <span {...attributes}>
 *       {children}
 *       @{(node as {username?: string}).username}
 *     </span>
 *   ),
 * })
 * ```
 */
export function defineInlineObject<const TType extends string>(config: {
  type: TType extends 'block'
    ? "Error: defineInlineObject({type: 'block'}) is forbidden -- 'block' is always a text block, use defineTextBlock"
    : TType extends 'span'
      ? "Error: defineInlineObject({type: 'span'}) is forbidden -- 'span' is always a span, use defineSpan"
      : TType
  render?: InlineObjectRender | null
}): InlineObject {
  return {kind: 'inlineObject', ...config} as unknown as InlineObject
}

/**
 * @alpha
 *
 * Define a text block renderer. The returned registration is mounted
 * via the `<NodePlugin>` component, or nested inside a container's
 * `of` array as a positional override.
 *
 * `type` is required even though the top-level text block type is
 * always `'block'`. Keeping `type` required leaves the door open for
 * positional overrides of text-block-like elements (e.g. a `code-line`
 * inside a `code-block` container).
 *
 * @example
 * ```ts
 * defineTextBlock({
 *   type: 'block',
 *   render: ({attributes, children}) => (
 *     <p {...attributes}>{children}</p>
 *   ),
 * })
 * ```
 */
export function defineTextBlock<const TType extends string>(config: {
  type: TType extends 'span'
    ? "Error: defineTextBlock({type: 'span'}) is forbidden -- 'span' is always a span, use defineSpan"
    : TType
  render?: TextBlockRender | null
  of?: ReadonlyArray<Span | InlineObject>
}): TextBlock {
  return {kind: 'textBlock', ...config} as unknown as TextBlock
}

/**
 * @internal
 *
 * Resolved span config.
 */
export type SpanConfig = {
  span: Span
}

/**
 * @internal
 *
 * Resolved block-object config.
 */
export type BlockObjectConfig = {
  blockObject: BlockObject
}

/**
 * @internal
 *
 * Resolved inline-object config.
 */
export type InlineObjectConfig = {
  inlineObject: InlineObject
}

/**
 * @internal
 *
 * Resolved container config carrying the pre-resolved `field` for the
 * activation position. Dispatch reads pre-resolved data without
 * re-walking the schema.
 */
export type ContainerConfig = {
  container: Container
  field: ChildArrayField
  of?: ReadonlyArray<ContainerConfig | BlockObjectConfig | TextBlockConfig>
}

/**
 * @internal
 *
 * Resolved text block config. The optional `of` carries resolved
 * inline-content positional overrides (spans, inline-objects) for
 * children rendered inside this text block.
 */
export type TextBlockConfig = {
  textBlock: TextBlock
  of?: ReadonlyArray<SpanConfig | InlineObjectConfig>
}
