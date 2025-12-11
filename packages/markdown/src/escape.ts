/**
 * Escapes special characters in link texts and image alt texts.
 */
export function escapeAltAndLinkText(text: string): string {
  return text.replace(/([[\]\\])/g, '\\$1')
}

/**
 * Unescapes special characters in image alt texts.
 */
export function unescapeAltText(text: string): string {
  return text.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1')
}

/**
 * Escapes special characters in link/image titles (the part inside quotes).
 */
export function escapeTitle(text: string): string {
  return text.replace(/([\\"])/g, '\\$1')
}
