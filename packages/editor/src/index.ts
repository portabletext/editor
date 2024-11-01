export type {Patch} from '@portabletext/patches'
export {
  type Behavior,
  type BehaviorActionIntend,
  type BehaviorContext,
  type BehaviorEvent,
  type BehaviorGuard,
  type PickFromUnion,
  type BehaviorActionIntendSet,
  defineBehavior,
} from './editor/behavior/behavior.types'
export {
  createMarkdownBehaviors,
  type MarkdownBehaviorsConfig,
} from './editor/behavior/behavior.markdown'
export {PortableTextEditable} from './editor/Editable'
export type {PortableTextEditableProps} from './editor/Editable'
export {
  editorMachine,
  type EditorActor,
  type MutationEvent,
  type PatchEvent,
  type PatchesEvent,
} from './editor/editor-machine'
export {usePortableTextEditor} from './editor/hooks/usePortableTextEditor'
export {usePortableTextEditorSelection} from './editor/hooks/usePortableTextEditorSelection'
export {defaultKeyGenerator as keyGenerator} from './editor/key-generator'
export {PortableTextEditor} from './editor/PortableTextEditor'
export type {PortableTextEditorProps} from './editor/PortableTextEditor'
export {useEditor, type Editor, type EditorConfig} from './editor/use-editor'
export * from './types/editor'
export * from './types/options'
