import type {Patch} from '@portabletext/patches'
import type {
  ArraySchemaType,
  BlockDecoratorDefinition,
  BlockListDefinition,
  BlockStyleDefinition,
  ObjectSchemaType,
  Path,
  PortableTextBlock,
  PortableTextChild,
  PortableTextListBlock,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
  TypedObject,
} from '@sanity/types'
import type {
  ClipboardEvent,
  FocusEvent,
  JSX,
  KeyboardEvent,
  PropsWithChildren,
  ReactElement,
  RefObject,
} from 'react'
import type {Observable, Subject} from 'rxjs'
import type {Descendant, Operation as SlateOperation} from 'slate'
import type {DOMNode} from 'slate-dom'
import type {ReactEditor} from 'slate-react'
import type {PortableTextEditableProps} from '../editor/Editable'
import type {PortableTextEditor} from '../editor/PortableTextEditor'
import type {DecoratedRange} from '../editor/range-decorations-machine'
import type {BlockPath} from './paths'

/** @beta */
export interface EditableAPIDeleteOptions {
  mode?: 'blocks' | 'children' | 'selected'
}

/** @beta */
export interface EditableAPI {
  activeAnnotations: () => PortableTextObject[]
  isAnnotationActive: (annotationType: PortableTextObject['_type']) => boolean
  addAnnotation: <TSchemaType extends {name: string}>(
    type: TSchemaType,
    value?: {[prop: string]: unknown},
  ) =>
    | {markDefPath: Path; markDefPaths: Array<Path>; spanPath: Path}
    | undefined
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
  ) => DOMNode | undefined
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

type HistoryItem = {
  operations: SlateOperation[]
  timestamp: Date
}

interface History {
  redos: HistoryItem[]
  undos: HistoryItem[]
}

/** @public */
export type EditorSelectionPoint = {path: Path; offset: number}
/** @public */
export type EditorSelection = {
  anchor: EditorSelectionPoint
  focus: EditorSelectionPoint
  backward?: boolean
} | null

export interface PortableTextSlateEditor extends ReactEditor {
  _key: 'editor'
  _type: 'editor'
  createPlaceholderBlock: () => Descendant
  editable: EditableAPI
  history: History
  insertPortableTextData: (data: DataTransfer) => boolean
  insertTextOrHTMLData: (data: DataTransfer) => boolean
  isTextBlock: (value: unknown) => value is PortableTextTextBlock
  isTextSpan: (value: unknown) => value is PortableTextSpan
  isListBlock: (value: unknown) => value is PortableTextListBlock
  value: Array<PortableTextBlock>
  decoratedRanges: Array<DecoratedRange>
  decoratorState: Record<string, boolean | undefined>
  blockIndexMap: Map<string, number>
  listIndexMap: Map<string, number>

  /**
   * Use hotkeys
   */
  pteWithHotKeys: (event: KeyboardEvent<HTMLDivElement>) => void

  /**
   * Helper function that creates a text block
   */
  pteCreateTextBlock: (options: {
    decorators: Array<string>
    listItem?: string
    level?: number
  }) => Descendant

  /**
   * Undo
   */
  undo: () => void

  /**
   * Redo
   */
  redo: () => void
}

/**
 * The editor has mutated it's content.
 * @beta */
export type MutationChange = {
  type: 'mutation'
  patches: Patch[]
  snapshot: PortableTextBlock[] | undefined
}

/**
 * The editor has produced a patch
 * @beta */
export type PatchChange = {
  type: 'patch'
  patch: Patch
}

/**
 * The editor has received a new (props) value
 * @beta */
export type ValueChange = {
  type: 'value'
  value: PortableTextBlock[] | undefined
}

/**
 * The editor has a new selection
 * @beta */
export type SelectionChange = {
  type: 'selection'
  selection: EditorSelection
}

/**
 * The editor received focus
 * @beta */
export type FocusChange = {
  type: 'focus'
  event: FocusEvent<HTMLDivElement, Element>
}

/**
 * @beta
 * @deprecated Use `'patch'` changes instead
 */
export type UnsetChange = {
  type: 'unset'
  previousValue: PortableTextBlock[]
}

/**
 * The editor blurred
 * @beta */
export type BlurChange = {
  type: 'blur'
  event: FocusEvent<HTMLDivElement, Element>
}

/**
 * The editor is currently loading something
 * Could be used to show a spinner etc.
 * @beta
 * @deprecated Will be removed in the next major version
 */
export type LoadingChange = {
  type: 'loading'
  isLoading: boolean
}

/**
 * The editor content is ready to be edited by the user
 * @beta */
export type ReadyChange = {
  type: 'ready'
}

/**
 * The editor produced an error
 * @beta
 * @deprecated The change is no longer emitted
 * */
export type ErrorChange = {
  type: 'error'
  name: string // short computer readable name
  level: 'warning' | 'error'
  description: string
  data?: unknown
}

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

/**
 * The editor has an invalid value
 * @beta */
export type InvalidValue = {
  type: 'invalidValue'
  resolution: InvalidValueResolution | null
  value: PortableTextBlock[] | undefined
}

/**
 * The editor performed a undo history step
 * @beta
 * @deprecated The change is no longer emitted
 *  */
export type UndoChange = {
  type: 'undo'
  patches: Patch[]
  timestamp: Date
}

/**
 * The editor performed redo history step
 * @beta
 * @deprecated The change is no longer emitted
 *  */
export type RedoChange = {
  type: 'redo'
  patches: Patch[]
  timestamp: Date
}

/**
 * The editor was either connected or disconnected to the network
 * To show out of sync warnings etc when in collaborative mode.
 * @beta
 * @deprecated The change is no longer emitted
 *  */
export type ConnectionChange = {
  type: 'connection'
  value: 'online' | 'offline'
}

/**
 * When the editor changes, it will emit a change item describing the change
 * @beta */
export type EditorChange =
  | BlurChange
  | ConnectionChange
  | ErrorChange
  | FocusChange
  | InvalidValue
  | LoadingChange
  | MutationChange
  | PatchChange
  | ReadyChange
  | RedoChange
  | SelectionChange
  | UndoChange
  | UnsetChange
  | ValueChange

/**
 * @beta
 */
export type EditorChanges = Subject<EditorChange>

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
  schemaTypes: PortableTextMemberSchemaTypes
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
export type OnBeforeInputFn = (event: InputEvent) => void

/** @beta */
export type OnCopyFn = (
  event: ClipboardEvent<HTMLDivElement | HTMLSpanElement>,
) => undefined | unknown

/** @beta */
export type PatchObservable = Observable<{
  patches: Patch[]
  snapshot: PortableTextBlock[] | undefined
}>

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
  schemaType: ObjectSchemaType
  /** @deprecated Use `schemaType` instead */
  type: ObjectSchemaType
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
  schemaType: ObjectSchemaType
  /** @deprecated Use `schemaType` instead */
  type: ObjectSchemaType
  value: PortableTextChild
}

/** @beta */
export interface BlockAnnotationRenderProps {
  block: PortableTextBlock
  children: ReactElement<any>
  editorElementRef: RefObject<HTMLElement | null>
  focused: boolean
  path: Path
  schemaType: ObjectSchemaType
  selected: boolean
  /** @deprecated Use `schemaType` instead */
  type: ObjectSchemaType
  value: PortableTextObject
}
/** @beta */
export interface BlockDecoratorRenderProps {
  children: ReactElement<any>
  editorElementRef: RefObject<HTMLElement | null>
  focused: boolean
  path: Path
  schemaType: BlockDecoratorDefinition
  selected: boolean
  /** @deprecated Use `schemaType` instead */
  type: BlockDecoratorDefinition
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
  schemaType: BlockListDefinition
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
  schemaType: BlockStyleDefinition
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
   * A optional callback that will be called when the range decoration potentially moves according to user edits.
   */
  onMoved?: (details: RangeDecorationOnMovedDetails) => void
  /**
   * A custom payload that can be set on the range decoration
   */
  payload?: Record<string, unknown>
}

/** @beta */
export type PortableTextMemberSchemaTypes = {
  annotations: (ObjectSchemaType & {i18nTitleKey?: string})[]
  block: ObjectSchemaType
  blockObjects: ObjectSchemaType[]
  decorators: BlockDecoratorDefinition[]
  inlineObjects: ObjectSchemaType[]
  portableText: ArraySchemaType<PortableTextBlock>
  span: ObjectSchemaType
  styles: BlockStyleDefinition[]
  lists: BlockListDefinition[]
}
