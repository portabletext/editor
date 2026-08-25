import type {Patch} from '@portabletext/patches'
import type {
  PortableTextBlock,
  PortableTextChild,
  PortableTextObject,
  TypedObject,
} from '@portabletext/schema'
import type {ClipboardEvent, JSX, PropsWithChildren, ReactElement} from 'react'
import type {PortableTextEditableProps} from '../editor/Editable'
import type {EditorSchema} from '../editor/editor-schema'
import type {PortableTextEditor} from '../editor/PortableTextEditor'
import type {Path} from './paths'

/**
 * @beta
 * @deprecated `EditableAPIDeleteOptions` is deprecated together with the
 * `PortableTextEditor.delete` static. Send a `delete` behavior event (with
 * an optional `unit`) or a `delete.block` event via `editor.send` instead.
 */
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

/** @internal */
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
  isVoid: (element: PortableTextBlock | PortableTextChild) => boolean
  isSelectionsOverlapping: (
    selectionA: EditorSelection,
    selectionB: EditorSelection,
  ) => boolean
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
 * @public */
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

/** @public */
export type RenderEditableFunction = (
  props: PortableTextEditableProps,
) => JSX.Element

/** @public */
export type RenderPlaceholderFunction = () => React.ReactNode

/** @public */
export type ScrollSelectionIntoViewFunction = (
  editor: PortableTextEditor,
  domRange: globalThis.Range,
) => void

/**
 * Details passed to a `RangeDecoration`'s `onMoved` callback.
 * @public */
export interface RangeDecorationOnMovedDetails {
  rangeDecoration: RangeDecoration
  newSelection: EditorSelection
  origin: 'remote' | 'local'
}
/**
 * A UI affordance that wraps a selection range in the editor with a custom
 * component, for example to highlight search results, mark validation
 * errors on specific words, or draw user presence.
 * @public */
export interface RangeDecoration {
  /**
   * The component that renders the range decoration. It receives the
   * decorated text as its children.
   *
   * The component can render more than once for one decoration: the range
   * is split into segments at formatting boundaries and where it overlaps
   * other decorations, and each segment gets its own wrapper. Where
   * decorations overlap, their components nest, first in array order
   * outermost.
   *
   * @example
   * ```tsx
   * (rangeComponentProps: PropsWithChildren) => (
   *    <SearchResultHighlight>
   *      {rangeComponentProps.children}
   *    </SearchResultHighlight>
   *  )
   * ```
   */
  component: (props: PropsWithChildren) => ReactElement<any>
  /**
   * The editor content selection range to decorate.
   */
  selection: EditorSelection
  /**
   * Called when edits move the decorated range. The details carry the new
   * selection (`null` when the range is lost) and whether the edit was
   * `local` or `remote`.
   */
  onMoved?: (details: RangeDecorationOnMovedDetails) => void
  /**
   * A custom payload that can be set on the range decoration.
   */
  payload?: Record<string, unknown>
}
