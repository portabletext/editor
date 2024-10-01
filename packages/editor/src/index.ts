export {type Patch} from '@portabletext/patches'
export {PortableTextEditable} from './editor/Editable'
export type {PortableTextEditableProps} from './editor/Editable'
export {
  editorMachine,
  type EditorActor,
  type MutationEvent,
  type PatchEvent,
} from './editor/editor-machine'
export {usePortableTextEditor} from './editor/hooks/usePortableTextEditor'
export {defaultKeyGenerator as keyGenerator} from './editor/hooks/usePortableTextEditorKeyGenerator'
export {usePortableTextEditorSelection} from './editor/hooks/usePortableTextEditorSelection'
export {PortableTextEditor} from './editor/PortableTextEditor'
export type {PortableTextEditorProps} from './editor/PortableTextEditor'
export * from './types/editor'
export * from './types/options'
