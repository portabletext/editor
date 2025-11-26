import type {TypedObject} from '@portabletext/types'
import {uriLooksSafe} from '../escape'
import type {PortableTextMarkComponent} from '../types'

interface DefaultLink extends TypedObject {
  _type: 'link'
  href: string
}

const link: PortableTextMarkComponent<DefaultLink> = ({children, value}) => {
  const href = value?.href || ''
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
    return `[${children}](${href})`
  }

  // Return children without link when URL is unsafe
  return children
}

export const defaultMarks: Record<
  string,
  PortableTextMarkComponent | undefined
> = {
  'em': ({children}) => `_${children}_`,
  'strong': ({children}) => `**${children}**`,
  'code': ({children}) => `\`${children}\``,
  'underline': ({children}) => `<u>${children}</u>`, // HTML fallback for underline
  'strike-through': ({children}) => `~~${children}~~`,
  link,
}
