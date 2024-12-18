export type {EditorSchema} from '../editor/define-schema'
export type {EditorContext} from '../editor/editor-snapshot'
export type {PickFromUnion} from '../type-utils'
export type {
  EditorSelection,
  EditorSelectionPoint,
  PortableTextMemberSchemaTypes,
} from '../types/editor'
export {
  createCodeEditorBehaviors,
  type CodeEditorBehaviorsConfig,
} from './behavior.code-editor'
export {coreBehavior, coreBehaviors} from './behavior.core'
export {
  type EmojiPickerBehaviorsConfig,
  createEmojiPickerBehaviors,
} from './behavior.emoji-picker'
export {createLinkBehaviors, type LinkBehaviorsConfig} from './behavior.links'
export {
  createMarkdownBehaviors,
  type MarkdownBehaviorsConfig,
} from './behavior.markdown'
export {
  defineBehavior,
  type Behavior,
  type BehaviorActionIntend,
  type BehaviorActionIntendSet,
  type BehaviorEvent,
  type BehaviorGuard,
  type BlockOffset,
  type NativeBehaviorEvent,
  type SyntheticBehaviorEvent,
} from './behavior.types'
