export function createPairRegex(char: string, amount: number) {
  // Negative lookbehind: Ensures that the matched sequence is not preceded by the same character
  const prePrefix = `(?<!\\${char})`

  // Repeats the character `amount` times
  const prefix = `\\${char}`.repeat(Math.max(amount, 1))

  // Negative lookahead: Ensures that the opening pair (**, *, etc.) is not followed by a space
  const postPrefix = `(?!\\s)`

  // Captures the content inside the pair
  const content = `([^${char}\\n]+?)`

  // Negative lookbehind: Ensures that the content is not followed by a space
  const preSuffix = `(?<!\\s)`

  // Repeats the character `amount` times
  const suffix = `\\${char}`.repeat(Math.max(amount, 1))

  // Negative lookahead: Ensures that the matched sequence is not followed by the same character
  const postSuffix = `(?!\\${char})`

  return `${prePrefix}${prefix}${postPrefix}${content}${preSuffix}${suffix}${postSuffix}`
}

const italicRegex = new RegExp(
  `(${createPairRegex('*', 1)}|${createPairRegex('_', 1)})$`,
)

const boldRegex = new RegExp(
  `(${createPairRegex('*', 2)}|${createPairRegex('_', 2)})$`,
)

export function getTextToItalic(text: string) {
  return text.match(italicRegex)?.at(0)
}

export function getTextToBold(text: string) {
  return text.match(boldRegex)?.at(0)
}
