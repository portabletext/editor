/**
 * Extract keyword from matched text using the pattern's capture group.
 * Strips the autoCompleteWith from the end before matching if present.
 * Returns capture group 1 if present, otherwise the full match (minus autoCompleteWith).
 * Falls back to non-stripped match if stripping results in empty keyword.
 */
export function extractKeywordFromPattern(
  matchedText: string,
  pattern: RegExp,
  autoCompleteWith?: string,
): string {
  if (autoCompleteWith && matchedText.endsWith(autoCompleteWith)) {
    const strippedText = matchedText.slice(0, -autoCompleteWith.length)
    const strippedMatch = strippedText.match(pattern)
    const strippedKeyword = strippedMatch
      ? (strippedMatch[1] ?? strippedMatch[0])
      : ''

    if (strippedKeyword.length > 0) {
      return strippedKeyword
    }
  }

  const match = matchedText.match(pattern)

  if (!match) {
    return matchedText
  }

  return match[1] ?? match[0]
}
