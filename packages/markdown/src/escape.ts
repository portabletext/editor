/**
 * Escapes special characters in image alt texts and link texts.
 */
export function escapeImageAndLinkText(text: string): string {
  return text.replace(/([[\]\\])/g, '\\$1')
}

/**
 * Unescapes special characters in image alt texts and link texts.
 */
export function unescapeImageAndLinkText(text: string): string {
  return text.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1')
}

/**
 * Escapes special characters in image/link titles (the part inside quotes).
 */
export function escapeImageAndLinkTitle(text: string): string {
  return text.replace(/([\\"])/g, '\\$1')
}
