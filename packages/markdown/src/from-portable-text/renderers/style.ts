import type {PortableTextBlock} from '@portabletext/types'
import type {PortableTextRenderer} from '../types'

type PortableTextBlockRenderer = PortableTextRenderer<PortableTextBlock>

/**
 * @public
 */
export const DefaultNormalRenderer: PortableTextBlockRenderer = ({
  children,
}) => {
  // Empty blocks should not add extra spacing
  if (!children || children.trim() === '') {
    return ''
  }

  return children
}

/**
 * @public
 */
export const DefaultBlockquoteRenderer: PortableTextBlockRenderer = ({
  children,
}) => {
  // Prefix each line with "> " for proper blockquote formatting
  // This handles multi-line content and preserves empty lines
  if (!children) return '>'

  return children
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')
}

/**
 * @public
 */
export const DefaultH1Renderer: PortableTextBlockRenderer = ({children}) =>
  `# ${children}`

/**
 * @public
 */
export const DefaultH2Renderer: PortableTextBlockRenderer = ({children}) =>
  `## ${children}`

/**
 * @public
 */
export const DefaultH3Renderer: PortableTextBlockRenderer = ({children}) =>
  `### ${children}`

/**
 * @public
 */
export const DefaultH4Renderer: PortableTextBlockRenderer = ({children}) =>
  `#### ${children}`

/**
 * @public
 */
export const DefaultH5Renderer: PortableTextBlockRenderer = ({children}) =>
  `##### ${children}`

/**
 * @public
 */
export const DefaultH6Renderer: PortableTextBlockRenderer = ({children}) =>
  `###### ${children}`

/**
 * @public
 */
export const DefaultUnknownStyleRenderer: PortableTextBlockRenderer = ({
  children,
}) => {
  return children ?? ''
}
