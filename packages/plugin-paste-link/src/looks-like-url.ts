export function looksLikeUrl(text: string) {
  try {
    const url = new URL(text)
    return sensibleProtocols.includes(url.protocol)
  } catch {
    return false
  }
}

const sensibleProtocols = ['http:', 'https:', 'mailto:', 'tel:']
