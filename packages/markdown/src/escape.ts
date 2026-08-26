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
 * A literal `|` ends the cell, so a pipe preceded by an even number of
 * backslashes (including zero) gets one more: paired backslashes cancel
 * out to a literal backslash and leave the pipe live, so parity, not mere
 * presence, decides whether it is already escaped. Newlines end the row,
 * so they are replaced with `<br>` to keep the visible line break inside
 * the cell.
 *
 * Backslashes themselves are left alone here; only the parity check reads
 * them, so escapes already in the rendered cell (such as `\[` and `\]` in
 * link text) survive the pass untouched.
 */
export function escapeTableCell(text: string): string {
  return text
    .replace(/(\\*)\|/g, (match, backslashes: string) =>
      backslashes.length % 2 === 0 ? `${backslashes}\\|` : match,
    )
    .replace(/\n/g, '<br>')
}
