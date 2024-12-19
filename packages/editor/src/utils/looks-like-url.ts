export function looksLikeUrl(text: string) {
  let looksLikeUrl = false
  try {
    try {
      const url = new URL(text)

      if (!sensibleProtocols.includes(url.protocol)) {
        return false
      }

      const probablyHasTld =
        url.hostname.length > 0 ? url.hostname.includes('.') : true

      looksLikeUrl = probablyHasTld
    } catch {
      const url = new URL(`https://${text}`)

      if (!sensibleProtocols.includes(url.protocol)) {
        return false
      }

      const probablyHasTld =
        url.hostname.length > 0 ? url.hostname.includes('.') : true

      looksLikeUrl = probablyHasTld
    }
  } catch {}
  return looksLikeUrl
}

const sensibleProtocols = ['http:', 'https:', 'mailto:', 'tel:']
