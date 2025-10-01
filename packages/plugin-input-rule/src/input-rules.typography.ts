import {defineInputRule, type InputRule} from './input-rule'

/**
 * @beta
 */
export const emDashRule = defineInputRule({
  matcher: /--/,
  transform: () => '—',
})

/**
 * @beta
 */
export const ellipsisRule = defineInputRule({
  matcher: /\.\.\./,
  transform: () => '…',
})

/**
 * @beta
 */
export const openingDoubleQuoteRule = defineInputRule({
  matcher: /(?:^|(?<=[\s{[(<'"\u2018\u201C]))"/g,
  transform: () => '“',
})

/**
 * @beta
 */
export const closingDoubleQuoteRule = defineInputRule({
  matcher: /"/g,
  transform: () => '”',
})

/**
 * @beta
 */
export const openingSingleQuoteRule = defineInputRule({
  matcher: /(?:^|(?<=[\s{[(<'"\u2018\u201C]))'/g,
  transform: () => '‘',
})

/**
 * @beta
 */
export const closingSingleQuoteRule = defineInputRule({
  matcher: /'/g,
  transform: () => '’',
})

/**
 * @beta
 */
export const smartQuotesRules: Array<InputRule> = [
  openingDoubleQuoteRule,
  closingDoubleQuoteRule,
  openingSingleQuoteRule,
  closingSingleQuoteRule,
]

/**
 * @beta
 */
export const leftArrowRule = defineInputRule({
  matcher: /<-/,
  transform: () => '←',
})

/**
 * @beta
 */
export const rightArrowRule = defineInputRule({
  matcher: /->/,
  transform: () => '→',
})

/**
 * @beta
 */
export const copyrightRule = defineInputRule({
  matcher: /\(c\)/,
  transform: () => '©',
})

/**
 * @beta
 */
export const servicemarkRule = defineInputRule({
  matcher: /\(sm\)/,
  transform: () => '℠',
})

/**
 * @beta
 */
export const trademarkRule = defineInputRule({
  matcher: /\(tm\)/,
  transform: () => '™',
})

/**
 * @beta
 */
export const registeredTrademarkRule = defineInputRule({
  matcher: /\(r\)/,
  transform: () => '®',
})

/**
 * @beta
 */
export const oneHalfRule = defineInputRule({
  matcher: /(?:^|\s)(1\/2)\s/,
  transform: () => '½',
})

/**
 * @beta
 */
export const plusMinusRule = defineInputRule({
  matcher: /\+\/-/,
  transform: () => '±',
})

/**
 * @beta
 */
export const notEqualRule = defineInputRule({
  matcher: /!=/,
  transform: () => '≠',
})

/**
 * @beta
 */
export const laquoRule = defineInputRule({
  matcher: /<</,
  transform: () => '«',
})

/**
 * @beta
 */
export const raquoRule = defineInputRule({
  matcher: />>/,
  transform: () => '»',
})

/**
 * @beta
 */
export const multiplicationRule = defineInputRule({
  matcher: /\d+\s?([*x])\s?\d+/,
  transform: () => '×',
})

/**
 * @beta
 */
export const superscriptTwoRule = defineInputRule({
  matcher: /\^2/,
  transform: () => '²',
})

/**
 * @beta
 */
export const superscriptThreeRule = defineInputRule({
  matcher: /\^3/,
  transform: () => '³',
})

/**
 * @beta
 */
export const oneQuarterRule = defineInputRule({
  matcher: /(?:^|\s)(1\/4)\s/,
  transform: () => '¼',
})

/**
 * @beta
 */
export const threeQuartersRule = defineInputRule({
  matcher: /(?:^|\s)(3\/4)\s/,
  transform: () => '¾',
})
