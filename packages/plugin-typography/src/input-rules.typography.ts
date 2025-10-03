import {
  defineTextTransformRule,
  type InputRule,
} from '@portabletext/plugin-input-rule'

/**
 * @beta
 */
export const emDashRule = defineTextTransformRule({
  matcher: /--/,
  transform: () => '—',
})

/**
 * @beta
 */
export const ellipsisRule = defineTextTransformRule({
  matcher: /\.\.\./,
  transform: () => '…',
})

/**
 * @beta
 */
export const openingDoubleQuoteRule = defineTextTransformRule({
  matcher: /(?:^|(?<=[\s{[(<'"\u2018\u201C]))"/g,
  transform: () => '“',
})

/**
 * @beta
 */
export const closingDoubleQuoteRule = defineTextTransformRule({
  matcher: /"/g,
  transform: () => '”',
})

/**
 * @beta
 */
export const openingSingleQuoteRule = defineTextTransformRule({
  matcher: /(?:^|(?<=[\s{[(<'"\u2018\u201C]))'/g,
  transform: () => '‘',
})

/**
 * @beta
 */
export const closingSingleQuoteRule = defineTextTransformRule({
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
export const leftArrowRule = defineTextTransformRule({
  matcher: /<-/,
  transform: () => '←',
})

/**
 * @beta
 */
export const rightArrowRule = defineTextTransformRule({
  matcher: /->/,
  transform: () => '→',
})

/**
 * @beta
 */
export const copyrightRule = defineTextTransformRule({
  matcher: /\(c\)/,
  transform: () => '©',
})

/**
 * @beta
 */
export const servicemarkRule = defineTextTransformRule({
  matcher: /\(sm\)/,
  transform: () => '℠',
})

/**
 * @beta
 */
export const trademarkRule = defineTextTransformRule({
  matcher: /\(tm\)/,
  transform: () => '™',
})

/**
 * @beta
 */
export const registeredTrademarkRule = defineTextTransformRule({
  matcher: /\(r\)/,
  transform: () => '®',
})

/**
 * @beta
 */
export const oneHalfRule = defineTextTransformRule({
  matcher: /(?:^|\s)(1\/2)\s/,
  transform: () => '½',
})

/**
 * @beta
 */
export const plusMinusRule = defineTextTransformRule({
  matcher: /\+\/-/,
  transform: () => '±',
})

/**
 * @beta
 */
export const notEqualRule = defineTextTransformRule({
  matcher: /!=/,
  transform: () => '≠',
})

/**
 * @beta
 */
export const laquoRule = defineTextTransformRule({
  matcher: /<</,
  transform: () => '«',
})

/**
 * @beta
 */
export const raquoRule = defineTextTransformRule({
  matcher: />>/,
  transform: () => '»',
})

/**
 * @beta
 */
export const multiplicationRule = defineTextTransformRule({
  matcher: /\d+\s?([*x])\s?\d+/,
  transform: () => '×',
})

/**
 * @beta
 */
export const superscriptTwoRule = defineTextTransformRule({
  matcher: /\^2/,
  transform: () => '²',
})

/**
 * @beta
 */
export const superscriptThreeRule = defineTextTransformRule({
  matcher: /\^3/,
  transform: () => '³',
})

/**
 * @beta
 */
export const oneQuarterRule = defineTextTransformRule({
  matcher: /(?:^|\s)(1\/4)\s/,
  transform: () => '¼',
})

/**
 * @beta
 */
export const threeQuartersRule = defineTextTransformRule({
  matcher: /(?:^|\s)(3\/4)\s/,
  transform: () => '¾',
})
