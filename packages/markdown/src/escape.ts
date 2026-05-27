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

/**
 * Escapes characters that have special meaning at the row level of a GFM
 * table cell.
 *
 * A literal `|` ends the cell, so unescaped pipes are replaced with `\|`.
 * Newlines end the row, so they are replaced with `<br>` to keep the
 * visible line break inside the cell. Already-escaped pipes (`\|`) are
 * left intact so that escapes introduced by mark renderers survive the
 * pass.
 *
 * Backslashes are intentionally not escaped here so that other escapes
 * already in the rendered cell (such as `\[` and `\]` in link text) are
 * not double-escaped.
 */
export function escapeTableCell(text: string): string {
  return text.replace(/(?<!\\)\|/g, '\\|').replace(/\n/g, '<br>')
}
