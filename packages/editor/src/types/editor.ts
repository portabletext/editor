import type {Patch} from '@portabletext/patches'
import type {
  PortableTextBlock,
  PortableTextChild,
  PortableTextObject,
  TypedObject,
} from '@portabletext/schema'
import type {ClipboardEvent, JSX, ReactElement, ReactNode} from 'react'
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
      /**
       * Delivered as-is to the `insert.blocks` Behavior event and validated
       * against the schema when inserted.
       */
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
 * Props passed to a `Decoration`'s `render`.
 * @beta
 */
export interface DecorationRenderProps {
  children: ReactNode
  /**
   * `true` for the fragment that contains the decoration's start point.
   * A collapsed decoration's single fragment is both `isFirst` and
   * `isLast`. Unique per decoration, so one-time chrome renders once.
   */
  isFirst: boolean
  /**
   * `true` for the fragment that contains the decoration's end point. A
   * collapsed decoration's single fragment is both `isFirst` and
   * `isLast`. Unique per decoration, so one-time chrome renders once.
   */
  isLast: boolean
}

/**
 * A decoration registered through `editor.registerDecorations`.
 * Unrelated to schema decorators (marks like `strong`).
 * @beta
 */
export interface Decoration {
  /**
   * Identity for reconciliation: an `update` call matches decorations to
   * their previous state by `id`, not by array position. Unique within
   * one registration (duplicates throw). The same `id` used across
   * different registrations refers to different decorations. Unrelated
   * to Portable Text's `_key`.
   */
  id: string
  /**
   * Discriminates the decoration's anchor shape. Only `'range'` exists
   * today.
   */
  type: 'range'
  /**
   * The editor content range to decorate. Feed a captured editor
   * selection straight in, for example a peer's presence selection or
   * the range a search match was found at. An edit that destroys the
   * underlying content kills the decoration (a mapping with
   * `newRange: null`). "No position" is omission from the array, not a
   * nullable `range`.
   */
  range: NonNullable<EditorSelection>
  /**
   * Plain-called factory returning an element tree. No hooks in the
   * body: state lives in components the tree mounts. Ignoring
   * `children` is legal (widget decorations).
   *
   * Chrome that carries no document text must be CSS generated content
   * or a `contentEditable={false}` element: bare text or editable
   * elements injected into the tree desync the caret from the document
   * (arrow keys jump or stick around the decorated range).
   *
   * The tree can render more than once for one decoration: the range is
   * split into segments at formatting boundaries and where it overlaps
   * other decorations, and each segment gets its own wrapper. Where
   * decorations overlap, they nest, first in array order outermost.
   */
  render: (props: DecorationRenderProps) => ReactElement
}

/**
 * What one engine operation did to one registered decoration's range.
 * @beta
 */
export type DecorationMapping = {
  /** The decoration's `id`, matching the `Decoration` it describes. */
  id: string
  /** The range the decoration held before the operation. */
  previousRange: NonNullable<EditorSelection>
  /**
   * The range after the operation. `null` means the operation destroyed
   * the decoration. Undo does not revive it: an `update()` with a
   * different range (or a drop and re-add) is required.
   */
  newRange: NonNullable<EditorSelection> | null
  /** Whether the operation changed content inside `previousRange`. */
  contentTouched: boolean
  /** Whether the operation came from a local edit or a remote one. */
  origin: 'local' | 'remote'
}

/**
 * One registered decoration's live position, as returned by
 * `DecorationRegistration.getDecorations`.
 * @beta
 */
export type DecorationPosition = {
  id: string
  range: NonNullable<EditorSelection>
}

/**
 * The handle returned by `editor.registerDecorations`.
 * @beta
 */
export interface DecorationRegistration {
  /** Full-set replacement, reconciled by `id`. */
  update(decorations: Array<Decoration>): void
  /** A no-op if already unregistered. */
  unregister(): void
  /**
   * Live decorations at call time: id + edit-adjusted range. Destroyed and
   * removed decorations are absent. Fresh array per call, with no
   * reference stability or change cadence. Reflects a completed `update()`
   * immediately and a burst of `onMapped` calls as of the latest one.
   * Empty before the editor's `ready` event.
   */
  getDecorations(): Array<DecorationPosition>
}
