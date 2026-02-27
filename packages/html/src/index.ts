// Bidirectional conversion
export {htmlToPortableText} from './to-portable-text/html-to-portable-text'
export {portableTextToHtml} from './from-portable-text/portable-text-to-html'

// HTML→PT types
export type {
  DeserializerRule,
  HtmlParser,
  HtmlToPortableTextOptions,
  WhiteSpacePasteMode,
} from './to-portable-text/types'
export type {
  SchemaMatchers,
  ImageSchemaMatcher,
} from './to-portable-text/schema-matchers'

// HTML→PT utilities
export {normalizeBlock} from './to-portable-text/normalize-block'
export type {BlockNormalizationOptions} from './to-portable-text/normalize-block'
export {randomKey} from './to-portable-text/util/randomKey'

// PT→HTML types
export type {
  PortableTextHtmlComponents,
  PortableTextBlockRenderer,
  PortableTextListRenderer,
  PortableTextListItemRenderer,
  PortableTextMarkRenderer,
  PortableTextTypeRenderer,
  PortableTextToHtmlOptions,
} from './types'

// Default renderers (all exported individually for composition)
export {
  defaultComponents,
  DefaultNormalRenderer,
  DefaultBlockquoteRenderer,
  DefaultH1Renderer,
  DefaultH2Renderer,
  DefaultH3Renderer,
  DefaultH4Renderer,
  DefaultH5Renderer,
  DefaultH6Renderer,
} from './from-portable-text/renderers/style'
export {
  DefaultEmRenderer,
  DefaultStrongRenderer,
  DefaultCodeRenderer,
  DefaultUnderlineRenderer,
  DefaultStrikeThroughRenderer,
  DefaultLinkRenderer,
} from './from-portable-text/renderers/marks'
export {
  DefaultBulletListRenderer,
  DefaultNumberListRenderer,
} from './from-portable-text/renderers/list'
export {DefaultListItemRenderer} from './from-portable-text/renderers/list-item'
export {DefaultHardBreakRenderer} from './from-portable-text/renderers/hard-break'

// Utilities
export {escapeHtml, uriLooksSafe} from './from-portable-text/escape'
