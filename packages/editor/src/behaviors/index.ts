export {
  createCodeEditorBehaviors,
  type CodeEditorBehaviorsConfig,
} from './behavior.code-editor'
export {coreBehaviors} from './behavior.core'
export {
  createEmojiPickerBehaviors,
  type EmojiPickerBehaviorsConfig,
} from './behavior.emoji-picker'
export {createLinkBehaviors, type LinkBehaviorsConfig} from './behavior.links'
export {
  createMarkdownBehaviors,
  type MarkdownBehaviorsConfig,
} from './behavior.markdown'

export {
  raise,
  type BehaviorAction,
  type BehaviorActionSet,
} from './behavior.types.action'
export {defineBehavior, type Behavior} from './behavior.types.behavior'
export type {
  BehaviorEvent,
  CustomBehaviorEvent,
  NativeBehaviorEvent,
  SyntheticBehaviorEvent,
} from './behavior.types.event'
export type {BehaviorGuard} from './behavior.types.guard'
