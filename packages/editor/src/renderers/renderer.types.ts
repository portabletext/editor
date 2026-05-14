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
 * Narrow the leaf node type by the registered `_type`. Spans get the
 * span shape; everything else gets the portable text object shape.
 * `'block'` is excluded -- text blocks are always containers.
 */
export type LeafNodeForType<TType extends string> = TType extends 'span'
  ? PortableTextSpan
  : PortableTextObject

/**
 * @alpha
 *
 * A container's render function receives a node and renders an element
 * that wraps its editable children. The render is positional: it fires for
 * nodes of `type` whose parent permits this container at `childField`.
 */
export type ContainerRender = (props: {
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  node: PortableTextTextBlock | PortableTextObject
  path: Path
  readOnly: boolean
  selected: boolean
}) => ReactElement | null

/**
 * @alpha
 *
 * A leaf's render function receives a terminal node (span, inline object,
 * or void block object) and renders an element wrapping it.
 *
 * The render must always render `children` somewhere inside the outer
 * element. For spans `children` carries the styled text. For inline
 * objects and void block objects `children` carries an engine-emitted
 * void spacer that the browser uses to anchor the caret next to the
 * element. Dropping `children` makes the caret unable to land on the
 * element.
 */
export type LeafRender = (props: {
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  node: PortableTextTextBlock | PortableTextSpan | PortableTextObject
  path: Path
  readOnly: boolean
  selected: boolean
}) => ReactElement | null

/**
 * @alpha
 *
 * A container registration. Identifies a block object `_type` whose value
 * holds editable children in `childField`. The optional `of` array carries
 * nested `defineContainer` and `defineLeaf` registrations that override
 * how immediate children of this container render at this lexical scope.
 *
 * `of` overrides apply ONE level down only. Children at deeper levels fall
 * through to global registrations.
 *
 * The `kind` field is injected by `defineContainer` and discriminates
 * containers from leaves at runtime.
 */
export type Container = {
  kind: 'container'
  type: string
  childField: string
  render?: ContainerRender
  of?: ReadonlyArray<Container | Leaf | TextBlock>
}

/**
 * @alpha
 *
 * A leaf registration. Identifies a terminal `_type` -- span, inline
 * object, or void block object -- and renders it.
 *
 * The `kind` field is injected by `defineLeaf` and discriminates leaves
 * from containers at runtime.
 */
export type Leaf = {
  kind: 'leaf'
  type: string
  render: LeafRender
}

/**
 * @alpha
 *
 * Define a container renderer. The returned registration is mounted via
 * the `<ContainerPlugin>` wrapper at the top level, or nested inside
 * another container's `of` array as a positional override.
 *
 * `type` cannot be `'span'` (use {@link defineLeaf}) nor `'block'` (use
 * {@link defineTextBlock}). The text block is not a container.
 *
 * The `node` argument of `render` narrows to a portable text object.
 *
 * @example
 * ```ts
 * defineContainer({
 *   type: 'table',
 *   childField: 'rows',
 *   render: ({children}) => <table>{children}</table>,
 *   of: [
 *     defineContainer({
 *       type: 'row',
 *       childField: 'cells',
 *       render: ({children}) => <tr>{children}</tr>,
 *     }),
 *   ],
 * })
 * ```
 */
export function defineContainer<const TType extends string>(config: {
  type: TType extends 'span'
    ? "Error: defineContainer({type: 'span'}) is forbidden -- 'span' is always a leaf, use defineLeaf"
    : TType extends 'block'
      ? "Error: defineContainer({type: 'block'}) is forbidden -- 'block' is always a text block, use defineTextBlock"
      : TType
  childField: string
  render?: (props: {
    attributes: Record<string, unknown>
    children: ReactElement
    focused: boolean
    node: ContainerNodeForType<TType>
    path: Path
    readOnly: boolean
    selected: boolean
  }) => ReactElement | null
  of?: ReadonlyArray<Container | Leaf | TextBlock>
}): Container {
  return {kind: 'container', ...config} as unknown as Container
}

/**
 * @alpha
 *
 * Define a leaf renderer for a span, inline object, or void block object.
 *
 * Leaves can be nested inside a container's `of` to override how that
 * type renders inside the specific parent. `defineLeaf({type: 'block'})`
 * nested inside a container's `of` is the spelling for a positional
 * text block override; the engine routes through the block-leaf pipeline
 * so marks and decorators still render correctly.
 *
 * When `type` is `'span'` the `node` argument of `render` narrows to a
 * portable text span; when `type` is `'block'` it narrows to a text block;
 * otherwise it narrows to a portable text object.
 *
 * @example
 * ```ts
 * defineLeaf({
 *   type: 'image',
 *   render: ({attributes, children, node}) => (
 *     <span {...attributes}>{children}<img src={node.src as string} /></span>
 *   ),
 * })
 * ```
 */
export function defineLeaf<const TType extends string>(config: {
  type: TType extends 'block'
    ? "Error: defineLeaf({type: 'block'}) is forbidden -- 'block' is always a container, use defineContainer"
    : TType
  render: (props: {
    attributes: Record<string, unknown>
    children: ReactElement
    focused: boolean
    node: LeafNodeForType<TType>
    path: Path
    readOnly: boolean
    selected: boolean
  }) => ReactElement | null
}): Leaf {
  return {kind: 'leaf', ...config} as unknown as Leaf
}

/**
 * @alpha
 *
 * A text block registration. The text block `_type` is `'block'`.
 *
 * `defineTextBlock` opts the text block into the new render pipeline.
 * The consumer's `render` callback owns the outer wrapper entirely:
 * the engine emits `data-pt-*` attributes only - no `pt-*` CSS
 * classes, no legacy `data-block-*` attributes - and the block-level
 * `renderStyle` / `renderListItem` / `renderBlock` props on
 * `<PortableTextEditable>` do not compose under this registration.
 *
 * Span-level render props - `renderDecorator`, `renderAnnotation`,
 * `renderPlaceholder`, and range decorations - keep working. They
 * fire on the spans inside `children` regardless of which text block
 * outer wrapper renders them.
 *
 * Consumers who want the legacy block-level composition keep using
 * `renderStyle` / `renderListItem` / `renderBlock` props and do not
 * register `defineTextBlock`.
 *
 * The `kind` field is injected by `defineTextBlock` and discriminates
 * text blocks from containers and leaves at runtime.
 */
export type TextBlock = {
  kind: 'text'
  type: 'block'
  render: TextBlockRender
}

/**
 * @alpha
 *
 * Text block render function. `children` carries the rendered spans -
 * `renderDecorator`, `renderAnnotation`, `renderPlaceholder`, and
 * range decorations have already fired at the leaf level. The
 * render's job is the outer wrapper element and any block-level
 * composition (style, list-item) the consumer wants.
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
 * Define a text block renderer. The returned registration is mounted
 * via the `<TextBlockPlugin>` wrapper.
 *
 * Only one text block registration is supported today. Subsequent
 * registrations log a console warning and skip.
 *
 * @example
 * ```ts
 * defineTextBlock({
 *   type: 'block',
 *   render: ({attributes, children}) => (
 *     // (p {...attributes})({children})(/p)
 *   ),
 * })
 * ```
 */
export function defineTextBlock(config: {
  type: 'block'
  render: TextBlockRender
}): TextBlock {
  return {kind: 'text', ...config}
}

/**
 * @internal
 *
 * Resolved leaf config.
 */
export type LeafConfig = {
  leaf: Leaf
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
  of?: ReadonlyArray<ContainerConfig | LeafConfig | TextBlockConfig>
}

/**
 * @internal
 *
 * Resolved text block config. Held in `EditorContext.textBlocks`.
 */
export type TextBlockConfig = {
  textBlock: TextBlock
}
