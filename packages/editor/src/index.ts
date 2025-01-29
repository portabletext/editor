export type {Patch} from '@portabletext/patches'
export type {
  PortableTextBlock,
  PortableTextChild,
  PortableTextSpan,
} from '@sanity/types'
export type {
  Behavior,
  BehaviorActionIntend,
  BehaviorActionIntendSet,
  BehaviorEvent,
  BehaviorGuard,
  BlockOffset,
  NativeBehaviorEvent,
  SyntheticBehaviorEvent,
} from './behaviors/index'
export type {Editor, EditorConfig, EditorEvent} from './editor/create-editor'
export type {SlateEditor} from './editor/create-slate-editor'
export {
  defineSchema,
  type BaseDefinition,
  type SchemaDefinition,
} from './editor/define-schema'
export type {PortableTextMemberSchemaTypes} from './types/editor'
export type {EditorSchema} from './editor/define-schema'
export {PortableTextEditable} from './editor/Editable'
export type {PortableTextEditableProps} from './editor/Editable'
export {EventListenerPlugin as EditorEventListener} from './plugins/plugin.event-listener'
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
export * from './types/editor'
export type {HotkeyOptions} from './types/options'
