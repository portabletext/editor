const markdownSyntaxChars = /([\\`*_{}[\]()#>+=|])/g

export function escapeMarkdown(str: string): string {
  if (!str) return str

  // Only escape characters that would be interpreted as Markdown syntax
  return str.replace(markdownSyntaxChars, '\\$1')
}

export function escapeURI(uri: string): string {
  if (!uri) return uri
  return encodeURIComponent(uri)
}

export function uriLooksSafe(uri: string): boolean {
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

export function htmlDecode(text: string): string {
  if (!text) return text

  const replacements: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&#x27;': "'",
  }

  return text.replace(
    /&(amp|lt|gt|quot|#39|nbsp|#x27);/g,
    (match) => replacements[match] || match,
  )
}
