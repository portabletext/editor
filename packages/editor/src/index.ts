export type {Patch} from '@portabletext/patches'
export type {
  PortableTextBlock,
  PortableTextTextBlock,
  PortableTextChild,
  PortableTextObject,
  PortableTextSpan,
} from '@sanity/types'
export type {Editor, EditorConfig, EditorEvent} from './editor'
export {EditorEventListener} from './editor-event-listener'
export {PortableTextEditable} from './editor/Editable'
export type {PortableTextEditableProps} from './editor/Editable'
export type {PatchesEvent} from './editor/editor-machine'
export {
  EditorProvider,
  type EditorProviderProps,
} from './editor/editor-provider'
export type {
  AnnotationSchemaType,
  BlockObjectSchemaType,
  DecoratorSchemaType,
  EditorSchema,
  InlineObjectSchemaType,
  ListSchemaType,
  StyleSchemaType,
} from './editor/editor-schema'
export {
  defineSchema,
  type AnnotationDefinition,
  type BaseDefinition,
  type BlockObjectDefinition,
  type DecoratorDefinition,
  type FieldDefinition,
  type InlineObjectDefinition,
  type ListDefinition,
  type SchemaDefinition,
  type StyleDefinition,
} from './editor/editor-schema-definition'
export {useEditorSelector, type EditorSelector} from './editor/editor-selector'
export type {EditorContext, EditorSnapshot} from './editor/editor-snapshot'
export {usePortableTextEditor} from './editor/hooks/usePortableTextEditor'
export {usePortableTextEditorSelection} from './editor/hooks/usePortableTextEditorSelection'
export {defaultKeyGenerator as keyGenerator} from './editor/key-generator'
export {PortableTextEditor} from './editor/PortableTextEditor'
export type {PortableTextEditorProps} from './editor/PortableTextEditor'
export type {EditorEmittedEvent, MutationEvent} from './editor/relay-machine'
export {useEditor} from './editor/use-editor'
export type {AddedAnnotationPaths} from './operations/behavior.operation.annotation.add'
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
export type {AnnotationPath, BlockPath, ChildPath} from './types/paths'
