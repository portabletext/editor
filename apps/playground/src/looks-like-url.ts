export function looksLikeUrl(text: string) {
  let looksLikeUrl = false
  try {
    const url = new URL(text)

    if (!sensibleProtocols.includes(url.protocol)) {
      return false
    }

    looksLikeUrl = true
  } catch {}
  return looksLikeUrl
}

const sensibleProtocols = ['http:', 'https:', 'mailto:', 'tel:']
