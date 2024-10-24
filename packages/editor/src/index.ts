export type {Patch} from '@portabletext/patches'
export type {
  Behavior,
  BehaviorActionIntend,
  BehaviorContext,
  BehaviorEvent,
  BehaviorGuard,
  RaiseBehaviorActionIntend,
  PickFromUnion,
} from './editor/behavior/behavior.types'
export {PortableTextEditable} from './editor/Editable'
export type {PortableTextEditableProps} from './editor/Editable'
export {
  editorMachine,
  type EditorActor,
  type MutationEvent,
  type PatchEvent,
} from './editor/editor-machine'
export {usePortableTextEditor} from './editor/hooks/usePortableTextEditor'
export {usePortableTextEditorSelection} from './editor/hooks/usePortableTextEditorSelection'
export {defaultKeyGenerator as keyGenerator} from './editor/key-generator'
export {PortableTextEditor} from './editor/PortableTextEditor'
export type {PortableTextEditorProps} from './editor/PortableTextEditor'
export * from './types/editor'
export * from './types/options'
