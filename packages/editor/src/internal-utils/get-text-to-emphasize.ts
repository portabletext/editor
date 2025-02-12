const asteriskPairRegex = '(?<!\\*)\\*(?!\\s)([^*\\n]+?)(?<!\\s)\\*(?!\\*)'
const underscorePairRegex = '(?<!_)_(?!\\s)([^_\\n]+?)(?<!\\s)_(?!_)'
const italicRegex = new RegExp(`(${asteriskPairRegex}|${underscorePairRegex})$`)

const doubleAsteriskPairRegex =
  '(?<!\\*)\\*\\*(?!\\s)([^*\\n]+?)(?<!\\s)\\*\\*(?!\\*)'
const doubleUnderscorePairRegex = '(?<!_)__(?!\\s)([^_\\n]+?)(?<!\\s)__(?!_)'
const boldRegex = new RegExp(
  `(${doubleAsteriskPairRegex}|${doubleUnderscorePairRegex})$`,
)

export function getTextToItalic(text: string) {
  return text.match(italicRegex)?.at(0)
}

export function getTextToBold(text: string) {
  return text.match(boldRegex)?.at(0)
}
