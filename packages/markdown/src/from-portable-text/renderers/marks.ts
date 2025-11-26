import type {TypedObject} from '@portabletext/types'
import type {PortableTextMarkRenderer} from '../types'

/**
 * @public
 */
export const DefaultEmRenderer: PortableTextMarkRenderer = ({children}) =>
  `_${children}_`

/**
 * @public
 */
export const DefaultStrongRenderer: PortableTextMarkRenderer = ({children}) =>
  `**${children}**`

/**
 * @public
 */
export const DefaultCodeRenderer: PortableTextMarkRenderer = ({children}) =>
  `\`${children}\``

/**
 * @public
 */
export const DefaultUnderlineRenderer: PortableTextMarkRenderer = ({
  children,
}) => `<u>${children}</u>`

/**
 * @public
 */
export const DefaultStrikeThroughRenderer: PortableTextMarkRenderer = ({
  children,
}) => `~~${children}~~`

interface DefaultLink extends TypedObject {
  _type: 'link'
  href: string
  title: string | undefined
}

/**
 * @public
 */
export const DefaultLinkRenderer: PortableTextMarkRenderer<DefaultLink> = ({
  children,
  value,
}) => {
  const href = value?.href || ''
  const title = value?.title || ''
  const looksSafe = uriLooksSafe(href)

  if (looksSafe) {
    // Check if the URL looks like an HTML injection attempt
    // If it has quotes AND angle brackets, or other suspicious patterns, encode more aggressively
    const looksLikeInjection = /["'][^"']*[<>]|[<>][^<>]*["']/.test(href)

    if (looksLikeInjection) {
      // Encode all special characters that could be used for injection
      const encodedHref = href.replace(/["<>() ]/g, (char) => {
        return `%${char.charCodeAt(0).toString(16).toUpperCase()}`
      })
      return `[${children}](${encodedHref})`
    }

    // For normal URLs, don't encode parentheses - Markdown handles balanced parens fine
    return `[${children}](${href}${title ? ` "${title}"` : ''})`
  }

  // Return children without link when URL is unsafe
  return children
}

function uriLooksSafe(uri: string): boolean {
  const url = (uri || '').trim()
  const first = url.charAt(0)

  if (first === '#' || first === '/') {
    return true
  }

  const colonIndex = url.indexOf(':')
  if (colonIndex === -1) {
    return true
  }

  const allowedProtocols = ['http', 'https', 'mailto', 'tel']
  const proto = url.slice(0, colonIndex).toLowerCase()
  if (allowedProtocols.indexOf(proto) !== -1) {
    return true
  }

  const queryIndex = url.indexOf('?')
  if (queryIndex !== -1 && colonIndex > queryIndex) {
    return true
  }

  const hashIndex = url.indexOf('#')
  if (hashIndex !== -1 && colonIndex > hashIndex) {
    return true
  }

  return false
}

/**
 * @public
 */
export const DefaultUnknownMarkRenderer: PortableTextMarkRenderer = ({
  children,
}) => {
  return children
}
