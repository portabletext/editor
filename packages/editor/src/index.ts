export type {Patch} from '@portabletext/patches'
export type {
  PortableTextBlock,
  PortableTextChild,
  PortableTextObject,
  PortableTextSpan,
  PortableTextTextBlock,
} from '@portabletext/schema'
export type {Editor, EditorConfig, EditorEvent} from './editor'
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
  InlineObjectSchemaType,
  ListSchemaType,
  StyleSchemaType,
} from '@portabletext/schema'
export type {EditorSchema} from './editor/editor-schema'
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
} from '@portabletext/schema'
export {useEditorSelector, type EditorSelector} from './editor/editor-selector'
export type {EditorContext, EditorSnapshot} from './editor/editor-snapshot'
export {usePortableTextEditor} from './editor/usePortableTextEditor'
export {usePortableTextEditorSelection} from './editor/usePortableTextEditorSelection'
export {defaultKeyGenerator as keyGenerator} from './utils/key-generator'
export {PortableTextEditor} from './editor/PortableTextEditor'
export type {EditorEmittedEvent, MutationEvent} from './editor/relay-machine'
export {useEditor} from './editor/use-editor'
export type {AddedAnnotationPaths} from './types/editor'
export type {BlockOffset} from './types/block-offset'
export type {
  BlockAnnotationRenderProps,
  BlockChildRenderProps,
  BlockDecoratorRenderProps,
  BlockListItemRenderProps,
  BlockRenderProps,
  BlockStyleRenderProps,
  EditableAPIDeleteOptions,
  EditorSelection,
  EditorSelectionPoint,
  InvalidValueResolution,
  OnCopyFn,
  OnPasteFn,
  OnPasteResult,
  OnPasteResultOrPromise,
  PasteData,
  RangeDecoration,
  RangeDecorationOnMovedDetails,
  RenderAnnotationFunction,
  RenderBlockFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
  RenderEditableFunction,
  RenderListItemFunction,
  RenderPlaceholderFunction,
  RenderStyleFunction,
  ScrollSelectionIntoViewFunction,
} from './types/editor'
export type {HotkeyOptions} from './types/options'
export type {AnnotationPath, BlockPath, ChildPath} from './types/paths'
