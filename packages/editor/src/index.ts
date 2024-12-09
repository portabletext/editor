export type {Patch} from '@portabletext/patches'
export type {PortableTextBlock, PortableTextChild} from '@sanity/types'
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
export {EditorEventListener} from './editor/editor-event-listener'
export {
  editorMachine,
  type EditorActor,
  type EditorEmittedEvent,
  type InternalEditorEmittedEvent,
  type InternalEditorEvent,
  type MutationEvent,
  type PatchEvent,
  type PatchesEvent,
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
export type {OmitFromUnion, PickFromUnion} from './type-utils'
export * from './types/editor'
export type {HotkeyOptions} from './types/options'
