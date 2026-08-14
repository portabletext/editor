import type {
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {Path} from '../engine/interfaces/path'
import type {ChildArrayField} from '../schema/resolve-containers'

/**
 * @public
 *
 * A container's render function receives a node and renders an element
 * that wraps its editable children. The render is positional: it fires for
 * nodes of `type` whose parent permits this container at `arrayField`.
 *
 * `node` is `PortableTextObject` because containers cannot register the
 * built-in `'span'` or `'block'` types (those are leaves and text blocks
 * respectively).
 */
export type ContainerRenderProps = {
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  node: PortableTextObject
  path: Path
  readOnly: boolean
  selected: boolean
  /**
   * Render this position with the engine's default wrapper. Call from
   * inside a custom render to fall back to or wrap the default:
   *
   * ```ts
   * render: (props) => props.renderDefault(props)
   * ```
   *
   * The default is the engine's minimal wrapper. It does not chain
   * back to a globally-registered render: PTE has one user layer plus
   * positional overrides, and the engine default is the canonical
   * fallback at any position.
   */
  renderDefault: (props: ContainerRenderProps) => ReactElement
}
/**
 * @public
 */
export type ContainerRender = (props: ContainerRenderProps) => ReactElement

/**
 * @public
 *
 * A span's render function. Receives a portable text span node and
 * wraps it. `children` carries the styled text already decorated by
 * the decorator/annotation renders (registered via `defineDecorator`/
 * `defineAnnotation`, or the legacy `renderDecorator`/`renderAnnotation`
 * props). Range decorations wrap this render's output from the
 * outside, so they are not part of `children`.
 */
export type SpanRenderProps = {
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  node: PortableTextSpan
  path: Path
  readOnly: boolean
  selected: boolean
  /**
   * Render this position with the engine's default wrapper.
   * See {@link ContainerRenderProps.renderDefault}.
   */
  renderDefault: (props: SpanRenderProps) => ReactElement
}
/**
 * @public
 */
export type SpanRender = (props: SpanRenderProps) => ReactElement

/**
 * @public
 *
 * A decorator's render function. Receives the decorator name and
 * wraps the styled text it applies to. Range and selection decorations
 * can split one span into several leaves, so this fires once per
 * decorator on each leaf, not once per span, nested in the span's
 * `marks` order alongside any decorators still rendered by the legacy
 * `renderDecorator` prop.
 *
 * The render is a plain function call, not a component: do not call
 * hooks in it. When you need hooks, return an element of your own
 * component: `render: (props) => <MyDecorator {...props} />`.
 */
export type DecoratorRenderProps = {
  children: ReactElement
  /**
   * The decorator name, e.g. `'strong'`. A `'*'` render
   * discriminates on this.
   */
  decorator: string
  focused: boolean
  /**
   * Path of the span carrying the decorator.
   */
  path: Path
  readOnly: boolean
  selected: boolean
  /**
   * Render this position with the engine's default wrapper.
   * See {@link ContainerRenderProps.renderDefault}. The default is
   * identity: the engine applies no decorator markup of its own.
   */
  renderDefault: (props: DecoratorRenderProps) => ReactElement
}
/**
 * @public
 */
export type DecoratorRender = (props: DecoratorRenderProps) => ReactElement

/**
 * @public
 *
 * An annotation's render function. Receives the annotation's `markDef`
 * object and wraps the styled text it applies to. The engine anchors
 * the text in a `<span>` outside this render regardless of whether a
 * render is registered, kept for structural parity with the legacy
 * `renderAnnotation` path (which hands that anchor to consumers as
 * `editorElementRef`); this render's job is the styling wrapper only.
 *
 * The render is a plain function call, not a component: do not call
 * hooks in it. When you need hooks, return an element of your own
 * component: `render: (props) => <MyAnnotation {...props} />`.
 */
export type AnnotationRenderProps = {
  /**
   * The annotation's `markDef` object: `{_key, _type, ...fields}`.
   * Named `annotation`, not `node`, because `path` addresses the span
   * leaf carrying the annotation; the markDef itself lives in the block's
   * `markDefs` array.
   */
  annotation: PortableTextObject
  children: ReactElement
  focused: boolean
  path: Path
  readOnly: boolean
  selected: boolean
  /**
   * Render this position with the engine's default wrapper.
   * See {@link ContainerRenderProps.renderDefault}. The default is
   * identity: the engine applies no annotation markup of its own.
   */
  renderDefault: (props: AnnotationRenderProps) => ReactElement
}
/**
 * @public
 */
export type AnnotationRender = (props: AnnotationRenderProps) => ReactElement

/**
 * @public
 *
 * A block object's render function. Receives a non-editable block-level
 * portable text object. `children` carries an engine-emitted void
 * spacer that the browser uses to anchor the caret next to the
 * element. Dropping `children` makes the caret unable to land on the
 * element.
 */
export type BlockObjectRenderProps = {
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  node: PortableTextObject
  path: Path
  readOnly: boolean
  selected: boolean
  /**
   * Render this position with the engine's default wrapper.
   * See {@link ContainerRenderProps.renderDefault}.
   */
  renderDefault: (props: BlockObjectRenderProps) => ReactElement
}
/**
 * @public
 */
export type BlockObjectRender = (props: BlockObjectRenderProps) => ReactElement

/**
 * @public
 *
 * An inline object's render function. Receives a non-editable inline
 * portable text object. `children` carries an engine-emitted void
 * spacer that the browser uses to anchor the caret next to the
 * element. Dropping `children` makes the caret unable to land on the
 * element.
 */
export type InlineObjectRenderProps = {
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  node: PortableTextObject
  path: Path
  readOnly: boolean
  selected: boolean
  /**
   * Render this position with the engine's default wrapper.
   * See {@link ContainerRenderProps.renderDefault}.
   */
  renderDefault: (props: InlineObjectRenderProps) => ReactElement
}
/**
 * @public
 */
export type InlineObjectRender = (
  props: InlineObjectRenderProps,
) => ReactElement

/**
 * @public
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
   * Outer render. Two modes:
   * - omitted: fall through to global registered render (or engine default)
   * - function: use this render. The function receives a `renderDefault`
   *   prop that returns the engine default when called.
   */
  render?: ContainerRender
  /**
   * Block-level positional overrides. Inline-content kinds (`Span`,
   * `InlineObject`) belong in `TextBlock.of`, not here.
   */
  of?: ReadonlyArray<Container | TextBlock | BlockObject>
}

/**
 * @public
 *
 * A text block registration. The text block `_type` is `'block'` at the
 * top level. Positional overrides nested in a container's `of` array can
 * register a different `_type` to render at that lexical scope.
 *
 * `defineTextBlock` opts the text block into the new render pipeline.
 * The consumer's `render` callback owns the outer wrapper entirely:
 * the engine emits `data-pt-*` attributes only - no `pt-*` CSS classes,
 * no legacy `data-block-*` attributes - and the block-level
 * `renderStyle`/`renderBlock` props on
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
   * Outer render. Two modes:
   * - omitted: fall through to global registered render (or engine default)
   * - function: use this render. The function receives a `renderDefault`
   *   prop that returns the engine default when called.
   */
  render?: TextBlockRender
  /**
   * Inline-content positional overrides. A `Span` or `InlineObject`
   * placed here scopes the inline render to this text block (or any
   * text block of this `type` if registered at the top level).
   * `Decorator` and `Annotation` entries scope those renders the
   * same way: the decorator or annotation renders through this entry
   * inside the text block, and through the global registration (or
   * the legacy `renderDecorator`/`renderAnnotation` prop) everywhere
   * else.
   */
  of?: ReadonlyArray<Span | InlineObject | Decorator | Annotation>
}

/**
 * @public
 *
 * Text block render function. `children` carries the rendered spans -
 * `renderDecorator`, `renderAnnotation`, `renderPlaceholder`, and range
 * decorations have already fired at the leaf level. The render's job
 * is the outer wrapper element and any block-level composition (style,
 * list-item) the consumer wants.
 */
export type TextBlockRenderProps = {
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  node: PortableTextTextBlock
  path: Path
  readOnly: boolean
  selected: boolean
  /**
   * Render this position with the engine's default wrapper.
   * See {@link ContainerRenderProps.renderDefault}.
   */
  renderDefault: (props: TextBlockRenderProps) => ReactElement
}
/**
 * @public
 */
export type TextBlockRender = (props: TextBlockRenderProps) => ReactElement

/**
 * @public
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
   * Outer render. Two modes:
   * - omitted: fall through to global registered render (or engine default)
   * - function: use this render. The function receives a `renderDefault`
   *   prop that returns the engine default when called.
   */
  render?: SpanRender
}

/**
 * @public
 *
 * A decorator registration. `type` is a decorator name declared in
 * the schema's `decorators` array, or `'*'` to match every decorator.
 */
export type Decorator = {
  kind: 'decorator'
  type: string
  /**
   * Outer render. Two modes:
   * - omitted: fall through to global registered render (or identity,
   *   the engine default, if no global registration exists)
   * - function: use this render. The function receives a `renderDefault`
   *   prop that returns identity when called.
   */
  render?: DecoratorRender
}

/**
 * @public
 *
 * An annotation registration. `type` is an annotation `_type` declared
 * in the schema's `annotations` array, or `'*'` to match every
 * annotation type.
 */
export type Annotation = {
  kind: 'annotation'
  type: string
  /**
   * Outer render. Two modes:
   * - omitted: fall through to global registered render (or identity,
   *   the engine default, if no global registration exists)
   * - function: use this render. The function receives a `renderDefault`
   *   prop that returns identity when called.
   */
  render?: AnnotationRender
}

/**
 * @public
 *
 * A non-editable block-level object registration. Identifies a `_type`
 * whose value renders as a block-level void node (image, embed, etc.).
 */
export type BlockObject = {
  kind: 'blockObject'
  type: string
  /**
   * Outer render. Two modes:
   * - omitted: fall through to global registered render (or engine default)
   * - function: use this render. The function receives a `renderDefault`
   *   prop that returns the engine default when called.
   */
  render?: BlockObjectRender
}

/**
 * @public
 *
 * A non-editable inline object registration. Identifies a `_type` whose
 * value renders as an inline void node (mention, inline image, etc.).
 */
export type InlineObject = {
  kind: 'inlineObject'
  type: string
  /**
   * Outer render. Two modes:
   * - omitted: fall through to global registered render (or engine default)
   * - function: use this render. The function receives a `renderDefault`
   *   prop that returns the engine default when called.
   */
  render?: InlineObjectRender
}

/**
 * @public
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
  | Decorator
  | Annotation

/**
 * @public
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
      : TType extends '*'
        ? "Error: defineContainer({type: '*'}) is forbidden -- containers cannot be registered by wildcard"
        : TType
  arrayField: string
  render?: (props: {
    attributes: Record<string, unknown>
    children: ReactElement
    focused: boolean
    node: TType extends 'span' | 'block' ? never : PortableTextObject
    path: Path
    readOnly: boolean
    selected: boolean
    renderDefault: (props: ContainerRenderProps) => ReactElement
  }) => ReactElement
  of?: ReadonlyArray<Container | TextBlock | BlockObject>
}): Container {
  return {kind: 'container', ...config} as unknown as Container
}

/**
 * @public
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
  render?: SpanRender
}): Span {
  return {kind: 'span', ...config} as unknown as Span
}

/**
 * @public
 *
 * Define a decorator renderer for a decorator name declared in the
 * schema's `decorators` array, or `'*'` to match every decorator.
 * The returned registration is mounted via the `<NodePlugin>`
 * component.
 *
 * Decorator names live in a different namespace than node
 * `_type`s, so `type` has no forbidden values here (unlike
 * `defineSpan`/`defineTextBlock`).
 *
 * @example
 * ```ts
 * defineDecorator({
 *   type: 'strong',
 *   render: ({children}) => <strong>{children}</strong>,
 * })
 * ```
 */
export function defineDecorator(config: {
  type: string
  render?: DecoratorRender
}): Decorator {
  return {kind: 'decorator', ...config}
}

/**
 * @public
 *
 * Define an annotation renderer for a `_type` declared in the
 * schema's `annotations` array, or `'*'` to match every annotation
 * type. The returned registration is mounted via the `<NodePlugin>`
 * component.
 *
 * Annotation `_type`s live in a different namespace than node
 * `_type`s, so `type` has no forbidden values here (unlike
 * `defineInlineObject`/`defineBlockObject`).
 *
 * @example
 * ```ts
 * defineAnnotation({
 *   type: 'link',
 *   render: ({annotation, children}) => (
 *     <a href={(annotation as {href?: string}).href}>{children}</a>
 *   ),
 * })
 * ```
 */
export function defineAnnotation(config: {
  type: string
  render?: AnnotationRender
}): Annotation {
  return {kind: 'annotation', ...config}
}

/**
 * @public
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
  render?: BlockObjectRender
}): BlockObject {
  return {kind: 'blockObject', ...config} as unknown as BlockObject
}

/**
 * @public
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
  render?: InlineObjectRender
}): InlineObject {
  return {kind: 'inlineObject', ...config} as unknown as InlineObject
}

/**
 * @public
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
  render?: TextBlockRender
  of?: ReadonlyArray<Span | InlineObject | Decorator | Annotation>
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
 * Resolved decorator config.
 */
export type DecoratorConfig = {
  decorator: Decorator
}

/**
 * @internal
 *
 * Resolved annotation config.
 */
export type AnnotationConfig = {
  annotation: Annotation
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
 * inline-content positional overrides (spans, inline-objects, and
 * per-decorator and per-annotation overrides) for children rendered
 * inside this text block.
 */
export type TextBlockConfig = {
  textBlock: TextBlock
  of?: ReadonlyArray<
    SpanConfig | InlineObjectConfig | DecoratorConfig | AnnotationConfig
  >
}
