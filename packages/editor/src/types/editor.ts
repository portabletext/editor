import type {Patch} from '@portabletext/patches'
import type {
  AnnotationSchemaType,
  BlockObjectSchemaType,
  DecoratorSchemaType,
  InlineObjectSchemaType,
  ListSchemaType,
  PortableTextBlock,
  PortableTextChild,
  PortableTextObject,
  PortableTextTextBlock,
  StyleSchemaType,
  TypedObject,
} from '@portabletext/schema'
import type {
  ClipboardEvent,
  JSX,
  PropsWithChildren,
  ReactElement,
  RefObject,
} from 'react'
import type {PortableTextEditableProps} from '../editor/Editable'
import type {EditorSchema} from '../editor/editor-schema'
import type {PortableTextEditor} from '../editor/PortableTextEditor'
import type {BlockPath, Path} from './paths'

/** @beta */
export interface EditableAPIDeleteOptions {
  mode?: 'blocks' | 'children' | 'selected'
}

/**
 * @public
 */
export type AddedAnnotationPaths = {
  /**
   * @deprecated An annotation may be applied to multiple blocks, resulting
   * in multiple `markDef`'s being created. Use `markDefPaths` instead.
   */
  markDefPath: Path
  markDefPaths: Array<Path>
  /**
   * @deprecated Does not return anything meaningful since an annotation
   * can span multiple blocks and spans. If references the span closest
   * to the focus point of the selection.
   */
  spanPath: Path
}

/** @beta */
export interface EditableAPI {
  activeAnnotations: () => PortableTextObject[]
  isAnnotationActive: (annotationType: PortableTextObject['_type']) => boolean
  addAnnotation: <TSchemaType extends {name: string}>(
    type: TSchemaType,
    value?: {[prop: string]: unknown},
  ) => AddedAnnotationPaths | undefined
  blur: () => void
  delete: (
    selection: EditorSelection,
    options?: EditableAPIDeleteOptions,
  ) => void
  findByPath: (
    path: Path,
  ) => [PortableTextBlock | PortableTextChild | undefined, Path | undefined]
  findDOMNode: (
    element: PortableTextBlock | PortableTextChild,
  ) => Node | undefined
  focus: () => void
  focusBlock: () => PortableTextBlock | undefined
  focusChild: () => PortableTextChild | undefined
  getSelection: () => EditorSelection
  getFragment: () => PortableTextBlock[] | undefined
  getValue: () => PortableTextBlock[] | undefined
  hasBlockStyle: (style: string) => boolean
  hasListStyle: (listStyle: string) => boolean
  insertBlock: <TSchemaType extends {name: string}>(
    type: TSchemaType,
    value?: {[prop: string]: unknown},
  ) => Path
  insertChild: <TSchemaType extends {name: string}>(
    type: TSchemaType,
    value?: {[prop: string]: unknown},
  ) => Path
  insertBreak: () => void
  isCollapsedSelection: () => boolean
  isExpandedSelection: () => boolean
  isMarkActive: (mark: string) => boolean
  isSelectionsOverlapping: (
    selectionA: EditorSelection,
    selectionB: EditorSelection,
  ) => boolean
  isVoid: (element: PortableTextBlock | PortableTextChild) => boolean
  marks: () => string[]
  redo: () => void
  removeAnnotation: <TSchemaType extends {name: string}>(
    type: TSchemaType,
  ) => void
  select: (selection: EditorSelection) => void
  toggleBlockStyle: (blockStyle: string) => void
  toggleList: (listStyle: string) => void
  toggleMark: (mark: string) => void
  undo: () => void
}

/** @public */
export type EditorSelectionPoint = {path: Path; offset: number}
/** @public */
export type EditorSelection = {
  anchor: EditorSelectionPoint
  focus: EditorSelectionPoint
  backward?: boolean
} | null

/**
 * The editor has invalid data in the value that can be resolved by the user
 * @beta */
export type InvalidValueResolution = {
  autoResolve?: boolean
  patches: Patch[]
  description: string
  action: string
  item: PortableTextBlock[] | PortableTextBlock | PortableTextChild | undefined

  /**
   * i18n keys for the description and action
   *
   * These are in addition to the description and action properties, to decouple the editor from
   * the i18n system, and allow usage without it. The i18n keys take precedence over the
   * description and action properties, if i18n framework is available.
   */
  i18n: {
    description: `inputs.portable-text.invalid-value.${Lowercase<string>}.description`
    action: `inputs.portable-text.invalid-value.${Lowercase<string>}.action`
    values?: Record<string, string | number | string[]>
  }
}

/** @beta */
export type OnPasteResult =
  | {
      insert?: TypedObject[]
      path?: Path
    }
  | undefined

/**
 * @beta
 */
export type OnPasteResultOrPromise = OnPasteResult | Promise<OnPasteResult>

/** @beta */
export interface PasteData {
  event: ClipboardEvent
  path: Path
  schemaTypes: EditorSchema
  value: PortableTextBlock[] | undefined
}

/**
 * @beta
 * It is encouraged not to return `Promise<undefined>` from the `OnPasteFn` as
 * a mechanism to fall back to the native paste behaviour. This doesn't work in
 * all cases. Always return plain `undefined` if possible.
 **/
export type OnPasteFn = (data: PasteData) => OnPasteResultOrPromise

/** @beta */
export type OnCopyFn = (
  event: ClipboardEvent<HTMLDivElement | HTMLSpanElement>,
) => undefined | unknown

/** @beta */
export interface BlockRenderProps {
  children: ReactElement<any>
  editorElementRef: RefObject<HTMLElement | null>
  focused: boolean
  level?: number
  listItem?: string
  path: BlockPath
  selected: boolean
  style?: string
  schemaType: BlockObjectSchemaType
  value: PortableTextBlock
}

/** @beta */
export interface BlockChildRenderProps {
  annotations: PortableTextObject[]
  children: ReactElement<any>
  editorElementRef: RefObject<HTMLElement | null>
  focused: boolean
  path: Path
  selected: boolean
  schemaType: InlineObjectSchemaType
  value: PortableTextChild
}

/** @beta */
export interface BlockAnnotationRenderProps {
  block: PortableTextBlock
  children: ReactElement<any>
  editorElementRef: RefObject<HTMLElement | null>
  focused: boolean
  path: Path
  schemaType: AnnotationSchemaType
  selected: boolean
  value: PortableTextObject
}
/** @beta */
export interface BlockDecoratorRenderProps {
  children: ReactElement<any>
  editorElementRef: RefObject<HTMLElement | null>
  focused: boolean
  path: Path
  schemaType: DecoratorSchemaType
  selected: boolean
  value: string
}
/** @beta */
export interface BlockListItemRenderProps {
  block: PortableTextTextBlock
  children: ReactElement<any>
  editorElementRef: RefObject<HTMLElement | null>
  focused: boolean
  level: number
  path: Path
  schemaType: ListSchemaType
  selected: boolean
  value: string
}

/** @beta */
export type RenderBlockFunction = (props: BlockRenderProps) => JSX.Element

/** @beta */
export type RenderChildFunction = (props: BlockChildRenderProps) => JSX.Element

/** @beta */
export type RenderEditableFunction = (
  props: PortableTextEditableProps,
) => JSX.Element

/** @beta */
export type RenderAnnotationFunction = (
  props: BlockAnnotationRenderProps,
) => JSX.Element

/** @beta */
export type RenderPlaceholderFunction = () => React.ReactNode

/** @beta */
export type RenderStyleFunction = (props: BlockStyleRenderProps) => JSX.Element

/** @beta */
export interface BlockStyleRenderProps {
  block: PortableTextTextBlock
  children: ReactElement<any>
  editorElementRef: RefObject<HTMLElement | null>
  focused: boolean
  path: Path
  selected: boolean
  schemaType: StyleSchemaType
  value: string
}

/** @beta */
export type RenderListItemFunction = (
  props: BlockListItemRenderProps,
) => JSX.Element

/** @beta */
export type RenderDecoratorFunction = (
  props: BlockDecoratorRenderProps,
) => JSX.Element

/** @beta */
export type ScrollSelectionIntoViewFunction = (
  editor: PortableTextEditor,
  domRange: globalThis.Range,
) => void

/**
 * Parameters for the callback that will be called for a RangeDecoration's onMoved.
 * @alpha */
export interface RangeDecorationOnMovedDetails {
  rangeDecoration: RangeDecoration
  previousSelection: EditorSelection
  newSelection: EditorSelection
  origin: 'remote' | 'local'
}
/**
 * A range decoration is a UI affordance that wraps a given selection range in the editor
 * with a custom component. This can be used to highlight search results,
 * mark validation errors on specific words, draw user presence and similar.
 * @alpha */
export interface RangeDecoration {
  /**
   * A component for rendering the range decoration.
   * The component will receive the children (text) of the range decoration as its children.
   *
   * @example
   * ```ts
   * (rangeComponentProps: PropsWithChildren) => (
   *    <SearchResultHighlight>
   *      {rangeComponentProps.children}
   *    </SearchResultHighlight>
   *  )
   * ```
   */
  component: (props: PropsWithChildren) => ReactElement<any>
  /**
   * The editor content selection range
   */
  selection: EditorSelection
  /**
   * Called when the range decoration moves due to edits.
   *
   * When `origin` is `'remote'`, the return value is honored: return an
   * `EditorSelection` to override the auto-resolved position (e.g. re-resolve
   * from a W3C annotation or other source of truth). This is useful because
   * remote structural ops (split/merge) may truncate or invalidate the
   * decoration, and the editor cannot reconstruct the full range without
   * consumer knowledge.
   *
   * When `origin` is `'local'`, the return value is ignored — local transforms
   * (split/merge context) already produce correct positions.
   */
  onMoved?: (details: RangeDecorationOnMovedDetails) => EditorSelection | void
  /**
   * Stable identifier for matching to external data (e.g., annotation/comment ID).
   * Set by the consumer — PTE preserves it and passes it through in onMoved details.
   */
  id?: string
  /**
   * A custom payload that can be set on the range decoration
   */
  payload?: Record<string, unknown>
}
