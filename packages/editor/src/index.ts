export type {Patch} from '@portabletext/patches'
export type {
  PortableTextBlock,
  PortableTextChild,
  PortableTextSpan,
} from '@sanity/types'
export type {AddedAnnotationPaths} from './behavior-actions/behavior.action.annotation.add'
export {EditorEventListener} from './editor-event-listener'
export type {Editor, EditorConfig, EditorEvent} from './editor/create-editor'
export {
  defineSchema,
  type BaseDefinition,
  type SchemaDefinition,
} from './editor/editor-schema'
export type {EditorSchema} from './editor/editor-schema'
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
export {PortableTextEditor} from './editor/PortableTextEditor'
export type {PortableTextEditorProps} from './editor/PortableTextEditor'
export type {BlockOffset} from './types/block-offset'
export type {
  BlockAnnotationRenderProps,
  BlockChildRenderProps,
  BlockDecoratorRenderProps,
  BlockListItemRenderProps,
  BlockRenderProps,
  BlockStyleRenderProps,
  BlurChange,
  ConnectionChange,
  EditableAPI,
  EditableAPIDeleteOptions,
  EditorChange,
  EditorChanges,
  EditorSelection,
  EditorSelectionPoint,
  ErrorChange,
  FocusChange,
  InvalidValue,
  InvalidValueResolution,
  LoadingChange,
  MutationChange,
  OnBeforeInputFn,
  OnCopyFn,
  OnPasteFn,
  OnPasteResult,
  OnPasteResultOrPromise,
  PasteData,
  PatchChange,
  PatchObservable,
  PortableTextMemberSchemaTypes,
  RangeDecoration,
  RangeDecorationOnMovedDetails,
  ReadyChange,
  RedoChange,
  RenderAnnotationFunction,
  RenderBlockFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
  RenderEditableFunction,
  RenderListItemFunction,
  RenderPlaceholderFunction,
  RenderStyleFunction,
  ScrollSelectionIntoViewFunction,
  SelectionChange,
  UndoChange,
  UnsetChange,
  ValueChange,
} from './types/editor'
export type {HotkeyOptions} from './types/options'
