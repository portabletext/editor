export {
  portableTextToSlack,
  type InlineObjectMatcher,
  type SerializeDegradation,
} from './from-portable-text/portable-text-to-slack'
export {
  slackToPortableText,
  type Degradation,
  type EmbedMatcher,
} from './to-portable-text/slack-to-portable-text'
export type {
  AnnotationMatcher,
  DecoratorMatcher,
  ListItemMatcher,
  ObjectMatcher,
  StyleMatcher,
} from './to-portable-text/matchers'
