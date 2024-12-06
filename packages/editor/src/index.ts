export type {Patch} from '@portabletext/patches'
export type {PortableTextBlock, PortableTextChild} from '@sanity/types'
export {
  createCodeEditorBehaviors,
  type CodeEditorBehaviorsConfig,
} from './editor/behavior/behavior.code-editor'
export {coreBehavior, coreBehaviors} from './editor/behavior/behavior.core'
export {
  createLinkBehaviors,
  type LinkBehaviorsConfig,
} from './editor/behavior/behavior.links'
export {
  createMarkdownBehaviors,
  type MarkdownBehaviorsConfig,
} from './editor/behavior/behavior.markdown'
export {getActiveListItem} from './editor/behavior/behavior.selector.get-active-list-item'
export {
  defineBehavior,
  type Behavior,
  type BehaviorActionIntend,
  type BehaviorActionIntendSet,
  type BehaviorEvent,
  type BehaviorGuard,
  type OmitFromUnion,
  type PickFromUnion,
} from './editor/behavior/behavior.types'
export type {BlockOffset} from './editor/behavior/behavior.utils.block-offset'
export type {Editor, EditorConfig, EditorEvent} from './editor/create-editor'
export type {SlateEditor} from './editor/create-slate-editor'
export {
  defineSchema,
  type BaseDefinition,
  type SchemaDefinition,
} from './editor/define-schema'
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
export {
  useEditorSelector,
  type EditorSelector,
  type EditorSelectorSnapshot,
} from './editor/editor-selector'
export type {EditorContext, EditorSnapshot} from './editor/editor-snapshot'
export {usePortableTextEditor} from './editor/hooks/usePortableTextEditor'
export {usePortableTextEditorSelection} from './editor/hooks/usePortableTextEditorSelection'
export {defaultKeyGenerator as keyGenerator} from './editor/key-generator'
export type {AddedAnnotationPaths} from './editor/plugins/createWithEditableAPI'
export {PortableTextEditor} from './editor/PortableTextEditor'
export type {PortableTextEditorProps} from './editor/PortableTextEditor'
export * from './types/editor'
export type {HotkeyOptions} from './types/options'
