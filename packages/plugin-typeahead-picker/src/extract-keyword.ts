/**
 * Extract keyword from pattern text using the trigger pattern.
 * Removes the trigger match from the start and delimiter from the end.
 *
 * @param patternText - The full pattern text (e.g., `:joy:` or `:joy`)
 * @param triggerPattern - Pattern matching the trigger (e.g., /:/)
 * @param delimiter - Optional delimiter character (e.g., `:`)
 * @param completePattern - Optional complete pattern to detect if this is a complete match
 */
export function extractKeyword(
  patternText: string,
  triggerPattern: RegExp,
  delimiter?: string,
  completePattern?: RegExp,
): string {
  const triggerMatch = patternText.match(triggerPattern)

  if (!triggerMatch || triggerMatch.index !== 0) {
    return patternText
  }

  let keyword = patternText.slice(triggerMatch[0].length)

  if (delimiter && keyword.endsWith(delimiter)) {
    // Check if this is a complete match (pattern matches the complete pattern exactly)
    const isCompleteMatch =
      completePattern &&
      (() => {
        const completeMatch = patternText.match(completePattern)
        return (
          completeMatch &&
          completeMatch.index === 0 &&
          completeMatch[0] === patternText
        )
      })()

    // Strip delimiter if:
    // - This is a complete match (even if keyword becomes empty), OR
    // - Keyword would remain non-empty after stripping
    if (isCompleteMatch || keyword.length > delimiter.length) {
      keyword = keyword.slice(0, -delimiter.length)
    }
  }

  return keyword
}
