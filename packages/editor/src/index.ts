export type {Patch} from '@portabletext/patches'
export type {
  PortableTextBlock,
  PortableTextChild,
  PortableTextSpan,
} from '@sanity/types'
export type {Editor, EditorConfig, EditorEvent} from './editor/create-editor'
export {
  defineSchema,
  type BaseDefinition,
  type SchemaDefinition,
} from './editor/define-schema'
export type {EditorSchema} from './editor/define-schema'
export {PortableTextEditable} from './editor/Editable'
export type {PortableTextEditableProps} from './editor/Editable'
export type {
  EditorEmittedEvent,
  MutationEvent,
  PatchesEvent,
} from './editor/editor-machine'
export {
  EditorProvider,
  useEditor,
  type EditorProviderProps,
} from './editor/editor-provider'
export {useEditorSelector, type EditorSelector} from './editor/editor-selector'
export type {EditorContext, EditorSnapshot} from './editor/editor-snapshot'
export {usePortableTextEditor} from './editor/hooks/usePortableTextEditor'
export {usePortableTextEditorSelection} from './editor/hooks/usePortableTextEditorSelection'
export {defaultKeyGenerator as keyGenerator} from './editor/key-generator'
export type {AddedAnnotationPaths} from './editor/plugins/createWithEditableAPI'
export {PortableTextEditor} from './editor/PortableTextEditor'
export type {PortableTextEditorProps} from './editor/PortableTextEditor'
export {EditorEventListener} from './editor-event-listener'
export type {BlockOffset} from './types/block-offset'
export type {
  EditableAPIDeleteOptions,
  EditableAPI,
  EditorSelectionPoint,
  EditorSelection,
  MutationChange,
  PatchChange,
  ValueChange,
  SelectionChange,
  FocusChange,
  UnsetChange,
  BlurChange,
  LoadingChange,
  ReadyChange,
  ErrorChange,
  InvalidValueResolution,
  InvalidValue,
  UndoChange,
  RedoChange,
  ConnectionChange,
  EditorChange,
  EditorChanges,
  OnPasteResult,
  OnPasteResultOrPromise,
  PasteData,
  OnPasteFn,
  OnBeforeInputFn,
  OnCopyFn,
  PatchObservable,
  BlockRenderProps,
  BlockChildRenderProps,
  BlockAnnotationRenderProps,
  BlockDecoratorRenderProps,
  BlockListItemRenderProps,
  RenderBlockFunction,
  RenderChildFunction,
  RenderEditableFunction,
  RenderAnnotationFunction,
  RenderPlaceholderFunction,
  RenderStyleFunction,
  BlockStyleRenderProps,
  RenderListItemFunction,
  RenderDecoratorFunction,
  ScrollSelectionIntoViewFunction,
  RangeDecorationOnMovedDetails,
  RangeDecoration,
  PortableTextMemberSchemaTypes,
} from './types/editor'
export type {HotkeyOptions} from './types/options'
